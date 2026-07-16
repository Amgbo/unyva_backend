import { Request, Response } from 'express';
import { pool } from '../db.js';
import { notificationService } from '../services/notificationService.js';
import { handleControllerError } from '../utils/apiError.js';

// POST /api/orders - Create a new order
export const createOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { items, delivery_address, delivery_fee, payment_method } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Order items are required' });
      return;
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const productIds = items.map((item: any) => item.product_id);

    const productsResult = await pool.query(
      `SELECT id, price, student_id as seller_id, title, status 
       FROM products 
       WHERE id = ANY($1)`,
      [productIds]
    );

    const productsMap = new Map(productsResult.rows.map((p: any) => [p.id, p]));

    for (const item of items) {
      const product = productsMap.get(item.product_id);
      if (!product) {
        res.status(404).json({ error: `Product ${item.product_id} not found` });
        return;
      }
      if (product.status !== 'available') {
        res.status(400).json({ error: `Product ${product.title} is no longer available` });
        return;
      }
      if (product.seller_id === studentId) {
        res.status(400).json({ error: 'Cannot order your own product' });
        return;
      }
      totalAmount += parseFloat(product.price) * (item.quantity || 1);
    }

    if (delivery_fee) {
      totalAmount += parseFloat(delivery_fee);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (student_id, total_amount, delivery_address, delivery_fee, payment_method, status)
         VALUES ($1, $2, $3, $4, $5, 'confirmed')
         RETURNING *`,
        [studentId, totalAmount, delivery_address || null, delivery_fee || null, payment_method || 'cash']
      );

      const order = orderResult.rows[0];

      // Create order items and update product status
      for (const item of items) {
        const product = productsMap.get(item.product_id);
        await client.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.product_id, product.seller_id, item.quantity || 1, product.price]
        );

        await client.query(
          `UPDATE products SET status = 'sold' WHERE id = $1`,
          [item.product_id]
        );

        // Notify seller
        try {
          await notificationService.createNewOrderNotification(
            product.seller_id,
            order.id,
            { product_title: product.title }
          );
        } catch (notifyError) {
          console.warn('Failed to notify seller:', notifyError);
        }
      }

      // Create delivery record
      await client.query(
        `INSERT INTO deliveries (order_id, status)
         VALUES ($1, 'pending')`,
        [order.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('❌ Create Order Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to create order',
      context: 'order/createOrder',
    });
  }
};

// GET /api/orders - Get user's orders
export const getMyOrders = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'title', p.title,
                'images', p.images
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.student_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      orders: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get My Orders Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch orders',
      context: 'order/getMyOrders',
    });
  }
};

// GET /api/orders/selling - Get orders for products the user is selling
export const getSellingOrders = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT DISTINCT o.*,
              json_agg(json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'title', p.title,
                'images', p.images
              )) as items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE oi.seller_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      orders: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Selling Orders Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch selling orders',
      context: 'order/getSellingOrders',
    });
  }
};

// GET /api/orders/:id - Get order by ID
export const getOrderById = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'title', p.title,
                'images', p.images,
                'seller_id', oi.seller_id
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = result.rows[0];
    const isBuyer = order.student_id === studentId;
    const isSeller = order.items.some((item: any) => item.seller_id === studentId);

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      success: true,
      order
    });
  } catch (err: any) {
    console.error('❌ Get Order By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch order',
      context: 'order/getOrderById',
    });
  }
};

// PUT /api/orders/:id/status - Update order status (seller/admin)
export const updateOrderStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const { status } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const validStatuses = ['confirmed', 'in_progress', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid order status' });
      return;
    }

    // Check if user is authorized (seller of any item in order or admin)
    const orderCheck = await pool.query(
      `SELECT o.*, oi.seller_id
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       LIMIT 1`,
      [id]
    );

    if (orderCheck.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const isAdmin = studentId === '22243185';
    const isSeller = orderCheck.rows.some((row: any) => row.seller_id === studentId);

    if (!isAdmin && !isSeller) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // Notify buyer
    try {
      await notificationService.createOrderStatusNotification(
        result.rows[0].student_id,
        parseInt(id),
        status
      );
    } catch (notifyError) {
      console.warn('Failed to notify buyer:', notifyError);
    }

    res.json({
      success: true,
      order: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Order Status Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update order status',
      context: 'order/updateOrderStatus',
    });
  }
};

// POST /api/orders/:id/cancel - Cancel order (buyer only before delivery)
export const cancelOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND student_id = $2',
      [id, studentId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orderResult.rows[0];
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      res.status(400).json({ error: 'Cannot cancel order at this stage' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      // Restore product availability
      await client.query(
        `UPDATE products SET status = 'available'
         WHERE id IN (SELECT product_id FROM order_items WHERE order_id = $1)`,
        [id]
      );

      await client.query('COMMIT');

      // Notify sellers
      const sellersResult = await pool.query(
        'SELECT DISTINCT seller_id FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const seller of sellersResult.rows) {
        try {
          await notificationService.createOrderStatusNotification(
            seller.seller_id,
            parseInt(id),
            'cancelled'
          );
        } catch (notifyError) {
          console.warn('Failed to notify seller:', notifyError);
        }
      }

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('❌ Cancel Order Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to cancel order',
      context: 'order/cancelOrder',
    });
  }
};
