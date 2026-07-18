import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

export const getCart = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT c.*, p.title, p.price, p.condition, p.images, s.first_name, s.last_name
       FROM cart c
       JOIN products p ON c.product_id = p.id
       JOIN students s ON p.student_id = s.student_id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
      [studentId]
    );

    const cartItems = result.rows.map((item: any) => ({
      ...item,
      images: item.images || []
    }));

    res.json({ success: true, cart: cartItems });
  } catch (err: any) {
    console.error('❌ Get Cart Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch cart',
      context: 'cart/getCart',
    });
  }
};

export const addToCart = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { product_id, quantity = 1 } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!product_id) {
      res.status(400).json({ error: 'Product ID is required' });
      return;
    }

    // Check if product exists and is not the user's own product
    const productResult = await pool.query(
      'SELECT student_id FROM products WHERE id = $1 AND status = $2',
      [product_id, 'available']
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found or not available' });
      return;
    }

    if (productResult.rows[0].student_id === studentId) {
      res.status(400).json({ error: 'You cannot add your own product to cart' });
      return;
    }

    // Check if already in cart
    const existingResult = await pool.query(
      'SELECT id FROM cart WHERE student_id = $1 AND product_id = $2',
      [studentId, product_id]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({ error: 'Product already in cart' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO cart (student_id, product_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [studentId, product_id, quantity]
    );

    res.status(201).json({ success: true, cart_item: result.rows[0] });
  } catch (err: any) {
    console.error('❌ Add To Cart Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add to cart',
      context: 'cart/addToCart',
    });
  }
};

export const updateCartItem = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (quantity === undefined || quantity < 1) {
      res.status(400).json({ error: 'Quantity must be at least 1' });
      return;
    }

    const result = await pool.query(
      `UPDATE cart SET quantity = $1
       WHERE id = $2 AND student_id = $3
       RETURNING *`,
      [quantity, id, studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    res.json({ success: true, cart_item: result.rows[0] });
  } catch (err: any) {
    console.error('❌ Update Cart Item Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update cart item',
      context: 'cart/updateCartItem',
    });
  }
};

export const removeFromCart = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM cart WHERE id = $1 AND student_id = $2 RETURNING *',
      [id, studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err: any) {
    console.error('❌ Remove From Cart Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to remove from cart',
      context: 'cart/removeFromCart',
    });
  }
};

export const clearCart = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await pool.query('DELETE FROM cart WHERE student_id = $1', [studentId]);

    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (err: any) {
    console.error('❌ Clear Cart Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to clear cart',
      context: 'cart/clearCart',
    });
  }
};

// ---------------------------------------------------------------------------
// Backward-compatible exports (older routes expect these named exports)
// ---------------------------------------------------------------------------

// Alias for older route name
export const addItemToCart = addToCart;

// Alias for older route name
export const removeItemFromCart = removeFromCart;

// Some older implementations used these names; map them to existing logic.
// - checkoutCart: treat as clearCart for now (checkout flow handled elsewhere)
export const checkoutCart = clearCart;

// clearAndAddItem: clear cart then add new item (expects product_id + quantity)
export const clearAndAddItem = async (req: any, res: Response): Promise<void> => {
  try {
    // Reuse existing endpoints to keep behavior consistent
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await pool.query('DELETE FROM cart WHERE student_id = $1', [studentId]);
    // Delegate to addToCart (will validate product_id, quantity, and ownership rules)
    return addToCart(req, res);
  } catch (err: any) {
    console.error('❌ Clear And Add Item Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to clear and add item to cart',
      context: 'cart/clearAndAddItem',
    });
  }
};

