import { Request, Response } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customer_id,
      product_id,
      quantity,
      delivery_option,
      delivery_fee,
      delivery_hall_id,
      delivery_room_number,
      special_instructions
    } = req.body;

    // Validate required fields
    if (!customer_id || !product_id || !quantity || !delivery_option) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_id, product_id, quantity, delivery_option'
      });
      return;
    }

    // Validate quantity is positive
    if (quantity <= 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
      return;
    }

    // Validate delivery option
    if (!['pickup', 'delivery'].includes(delivery_option)) {
      res.status(400).json({
        success: false,
        message: 'Invalid delivery_option. Must be "pickup" or "delivery"'
      });
      return;
    }

    // Get product details and validate quantity availability
    const productQuery = `
      SELECT p.*, s.student_id as seller_id, p.hall_id as seller_hall_id, p.room_number as seller_room_number
      FROM products p
      JOIN students s ON p.student_id = s.student_id
      WHERE p.id = $1 AND p.status = 'available' AND p.quantity >= $2
    `;
    const productResult = await pool.query(productQuery, [product_id, quantity]);

    if (productResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Product not found, not available, or insufficient quantity'
      });
      return;
    }

    const product = productResult.rows[0];
    const seller_id = product.seller_id;
    const unit_price = product.price;
    const total_price = (unit_price * quantity) + (delivery_fee || 0);

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          order_number, customer_id, seller_id, product_id, quantity,
          unit_price, total_price, delivery_option, delivery_fee,
          status, payment_status, delivery_hall_id, delivery_room_number,
          special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const orderValues = [
        orderNumber, customer_id, seller_id, product_id, quantity,
        unit_price, total_price, delivery_option, delivery_fee || 0,
        delivery_option === 'delivery' ? 'pending' : 'confirmed', // Set status to pending if delivery
        delivery_option === 'delivery' ? 'pending' : 'paid', // Set payment_status to pending if delivery
        delivery_hall_id, delivery_room_number,
        special_instructions
      ];

      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      // Update product quantity after successful order creation
      const updateQuantityQuery = `
        UPDATE products
        SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await client.query(updateQuantityQuery, [quantity, product_id]);

      // For delivery orders, set product status to 'reserved' (committed but awaiting delivery)
      // For pickup orders, keep product as 'available' with reduced quantity
      if (delivery_option === 'delivery') {
        const updateProductStatusQuery = `
          UPDATE products
          SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        await client.query(updateProductStatusQuery, [product_id]);
      }
      // For pickup orders, keep product as 'available' with reduced quantity

      // Create delivery request if delivery is selected
      if (delivery_option === 'delivery') {
        const deliveryQuery = `
          INSERT INTO deliveries (
            order_id, customer_id, seller_id, pickup_hall_id, pickup_room_number,
            delivery_hall_id, delivery_room_number, delivery_fee, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;

        const deliveryValues = [
          order.id, customer_id, seller_id, product.seller_hall_id, product.seller_room_number,
          delivery_hall_id, delivery_room_number, delivery_fee || 0, 'pending',
          special_instructions || 'Delivery request created'
        ];

        const deliveryResult = await client.query(deliveryQuery, deliveryValues);
        const delivery = deliveryResult.rows[0];

        // Delivery will remain pending for manual acceptance by delivery persons
      }

      // Clear cart item if it exists (remove the specific quantity ordered from cart)
      // First check if there's a cart item for this product
      const cartCheckQuery = `
        SELECT id, quantity FROM cart
        WHERE student_id = $1 AND product_id = $2
      `;
      const cartCheckResult = await client.query(cartCheckQuery, [customer_id, product_id]);

      if (cartCheckResult.rows.length > 0) {
        const cartItem = cartCheckResult.rows[0];
        if (cartItem.quantity <= quantity) {
          // Remove entire cart item if cart quantity is less than or equal to ordered quantity
          await client.query(
            'DELETE FROM cart WHERE id = $1',
            [cartItem.id]
          );
        } else {
          // Reduce cart quantity by ordered amount
          await client.query(
            'UPDATE cart SET quantity = quantity - $1 WHERE id = $2',
            [quantity, cartItem.id]
          );
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order: order,
          delivery_created: delivery_option === 'delivery'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const student_id = (req as any).user?.student_id;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    let queryParams: any[] = [];

    if (student_id) {
      whereClause = 'WHERE o.customer_id = $1 OR o.seller_id = $1';
      queryParams.push(student_id);
    }

    if (status) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += 'o.status = $' + (queryParams.length + 1);
      queryParams.push(status);
    }

    const ordersQuery = `
      SELECT
        o.*,
        p.title as product_title,
        p.description as product_description,
        p.category as product_category,
        cs.first_name as customer_first_name,
        cs.last_name as customer_last_name,
        cs.phone as customer_phone,
        ss.first_name as seller_first_name,
        ss.last_name as seller_last_name,
        ss.phone as seller_phone,
        uh.full_name as delivery_hall_name,
        d.status as delivery_status,
        d.delivery_person_id,
        dp.first_name as delivery_person_first_name,
        dp.last_name as delivery_person_last_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN students cs ON o.customer_id = cs.student_id
      JOIN students ss ON o.seller_id = ss.student_id
      LEFT JOIN university_halls uh ON o.delivery_hall_id = uh.id
      LEFT JOIN deliveries d ON o.id = d.order_id
      LEFT JOIN students dp ON d.delivery_person_id = dp.student_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const ordersResult = await pool.query(ordersQuery, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM orders o ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        orders: ordersResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const orderQuery = `
      SELECT
        o.*,
        p.title as product_title,
        p.description as product_description,
        p.category as product_category,
        p.condition as product_condition,
        cs.first_name as customer_first_name,
        cs.last_name as customer_last_name,
        cs.phone as customer_phone,
        cs.email as customer_email,
        ss.first_name as seller_first_name,
        ss.last_name as seller_last_name,
        ss.phone as seller_phone,
        ss.email as seller_email,
        uh.full_name as delivery_hall_name,
        d.status as delivery_status,
        d.delivery_person_id,
        d.assigned_at,
        d.started_at,
        d.completed_at,
        d.rating,
        d.review,
        dp.first_name as delivery_person_first_name,
        dp.last_name as delivery_person_last_name,
        dp.phone as delivery_person_phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN students cs ON o.customer_id = cs.student_id
      JOIN students ss ON o.seller_id = ss.student_id
      LEFT JOIN university_halls uh ON o.delivery_hall_id = uh.id
      LEFT JOIN deliveries d ON o.id = d.order_id
      LEFT JOIN students dp ON d.delivery_person_id = dp.student_id
      WHERE o.id = $1
    `;

    const orderResult = await pool.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    res.json({
      success: true,
      data: orderResult.rows[0]
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'assigned', 'in_progress', 'delivered', 'cancelled'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, confirmed, assigned, in_progress, delivered, cancelled'
      });
      return;
    }

    const updateQuery = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [status, id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
