import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import {
  getCartItems,
  addToCart,
  removeCartItem,
  updateCartItemQuantity,
  getCartTotal
} from '../models/cartModel.js';
import { getProductById } from '../models/productModel.js';
import { pool } from '../db.js';

// GET: Get user's cart
export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const cartItems = await getCartItems(studentId);
    const cartTotal = await getCartTotal(studentId);

    // Transform data to match frontend expectations
    const transformedItems = cartItems.map(item => ({
      id: item.id,
      productId: item.product_id,
      name: item.title,
      price: item.price,
      image: item.images && item.images.length > 0 ? item.images[0].image_url : '',
      quantity: item.quantity,
      available_quantity: item.product_quantity, // Add available stock quantity
      product: {
        id: item.product_id,
        title: item.title,
        price: item.price,
        student_id: item.seller_student_id,
        student_name: `${item.first_name} ${item.last_name}`.trim(),
      },
      seller_name: `${item.first_name} ${item.last_name}`.trim(),
    }));

    res.json({
      success: true,
      data: transformedItems,
      total: cartTotal.totalPrice,
      itemCount: cartTotal.totalItems,
    });
  } catch (error) {
    console.error('❌ Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
};

// POST: Add item to cart
export const addItemToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { productId, quantity = 1 } = req.body;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
      return;
    }

    // Validate product exists
    const product = await getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    // Prevent adding own product to cart
    if (product.student_id === studentId) {
      res.status(403).json({
        success: false,
        error: 'You cannot add your own product to cart'
      });
      return;
    }

    // Check if product is available or sold (allow sold products to be repurchased)
    if (product.status !== 'available' && product.status !== 'sold') {
      res.status(400).json({
        success: false,
        error: 'Product is not available for purchase'
      });
      return;
    }

    // Check if requested quantity is available
    if (product.quantity !== undefined && product.quantity !== null && quantity > product.quantity) {
      res.status(400).json({
        success: false,
        error: `Only ${product.quantity} units available. Cannot add ${quantity} units to cart.`
      });
      return;
    }

    const cartItem = await addToCart(studentId, productId, quantity);

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        id: cartItem.id,
        productId: cartItem.product_id,
        quantity: cartItem.quantity,
      },
    });
  } catch (error) {
    console.error('❌ Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  }
};

// PUT: Update cart item quantity
export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    if (!cartItemId || quantity === undefined) {
      res.status(400).json({
        success: false,
        error: 'Cart item ID and quantity are required'
      });
      return;
    }

    if (quantity < 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid quantity'
      });
      return;
    }

    // Check if cart item belongs to the user
    const cartItems = await getCartItems(studentId);
    const cartItem = cartItems.find(item => item.id === parseInt(cartItemId));

    if (!cartItem) {
      res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
      return;
    }

    const updatedItem = await updateCartItemQuantity(parseInt(cartItemId), quantity);

    if (!updatedItem) {
      res.status(404).json({
        success: false,
        error: 'Cart item not found or was removed'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    console.error('❌ Error updating cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
};

// DELETE: Remove item from cart
export const removeItemFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { cartItemId } = req.params;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    if (!cartItemId) {
      res.status(400).json({
        success: false,
        error: 'Cart item ID is required'
      });
      return;
    }

    // Check if cart item belongs to the user
    const cartItems = await getCartItems(studentId);
    const cartItem = cartItems.find(item => item.id === parseInt(cartItemId));

    if (!cartItem) {
      res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
      return;
    }

    const removed = await removeCartItem(parseInt(cartItemId));

    if (!removed) {
      res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
    });
  } catch (error) {
    console.error('❌ Error removing item from cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
};

// POST: Checkout cart with delivery options
export const checkoutCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const {
      delivery_option,
      delivery_fee,
      delivery_hall_id,
      delivery_room_number,
      special_instructions,
      seller_id
    } = req.body;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Validate delivery option
    if (!['pickup', 'delivery'].includes(delivery_option)) {
      res.status(400).json({
        success: false,
        error: 'Invalid delivery_option. Must be "pickup" or "delivery"'
      });
      return;
    }

    // Get cart items
    const allCartItems = await getCartItems(studentId);

    // Filter items by seller if seller_id is provided
    const cartItems = seller_id
      ? allCartItems.filter(item => item.seller_student_id === seller_id)
      : allCartItems;

    if (cartItems.length === 0) {
      res.status(400).json({
        success: false,
        error: seller_id ? 'No items found for this seller in cart' : 'Cart is empty'
      });
      return;
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orders = [];
      const deliveryRequests = [];

      // Process each cart item
      for (const item of cartItems) {
        // Get product details
        const productQuery = `
          SELECT p.*, s.student_id as seller_id, uh.id as seller_hall_id, s.room_number as seller_room_number
          FROM products p
          JOIN students s ON p.student_id = s.student_id
          LEFT JOIN university_halls uh ON s.hall_of_residence = uh.full_name
          WHERE p.id = $1 AND (p.status = 'available' OR p.status = 'sold')
        `;
        const productResult = await client.query(productQuery, [item.product_id]);

        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found or not available`);
        }

        const product = productResult.rows[0];
        const seller_id = product.seller_id;
        const unit_price = product.price;

        // Check if quantity is still available before checkout
        if (product.quantity !== undefined && product.quantity !== null && item.quantity > product.quantity) {
          throw new Error(`Product ${product.title} only has ${product.quantity} units available. Cannot checkout ${item.quantity} units.`);
        }

        const total_price = (unit_price * item.quantity) + (delivery_fee || 0);

        // Generate unique order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

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
          orderNumber, studentId, seller_id, item.product_id, item.quantity,
          unit_price, total_price, delivery_option, delivery_fee || 0,
          'confirmed', 'paid', delivery_hall_id, delivery_room_number,
          special_instructions
        ];

        const orderResult = await client.query(orderQuery, orderValues);
        const order = orderResult.rows[0];
        orders.push(order);

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
            order.id, studentId, seller_id, product.seller_hall_id, product.seller_room_number,
            delivery_hall_id, delivery_room_number, delivery_fee || 0, 'pending',
            special_instructions || 'Delivery request created'
          ];

          const deliveryResult = await client.query(deliveryQuery, deliveryValues);
          deliveryRequests.push(deliveryResult.rows[0]);
        }

        // Keep product status as 'available' so it remains purchasable by other users
        // Product sales are tracked through the orders table, not product status
      }

      // Clear cart items for this seller only
      if (seller_id) {
        await client.query(
          'DELETE FROM cart WHERE student_id = $1 AND product_id IN (SELECT id FROM products WHERE student_id = $2)',
          [studentId, seller_id]
        );
      } else {
        // Clear all cart items (legacy behavior)
        await client.query(
          'DELETE FROM cart WHERE student_id = $1',
          [studentId]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Checkout completed successfully',
        data: {
          orders: orders,
          delivery_requests: deliveryRequests,
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
    console.error('❌ Error during checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
