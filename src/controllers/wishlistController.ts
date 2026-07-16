import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/wishlist - Get user's wishlist
export const getWishlist = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT w.id as wishlist_id, w.created_at as added_at,
              p.*, s.first_name, s.last_name
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       JOIN students s ON p.student_id = s.student_id
       WHERE w.student_id = $1
       ORDER BY w.created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      wishlist: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Wishlist Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch wishlist',
      context: 'wishlist/getWishlist',
    });
  }
};

// POST /api/wishlist - Add product to wishlist
export const addToWishlist = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { product_id } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!product_id) {
      res.status(400).json({ error: 'Product ID is required' });
      return;
    }

    // Check if product exists
    const productResult = await pool.query(
      'SELECT id FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Check if already in wishlist
    const existingResult = await pool.query(
      'SELECT id FROM wishlist WHERE student_id = $1 AND product_id = $2',
      [studentId, product_id]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({ error: 'Product already in wishlist' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO wishlist (student_id, product_id)
       VALUES ($1, $2)
       RETURNING *`,
      [studentId, product_id]
    );

    res.status(201).json({
      success: true,
      message: 'Added to wishlist',
      wishlist_item: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add To Wishlist Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add to wishlist',
      context: 'wishlist/addToWishlist',
    });
  }
};

// DELETE /api/wishlist/:id - Remove from wishlist
export const removeFromWishlist = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM wishlist WHERE id = $1 AND student_id = $2 RETURNING *',
      [id, studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Wishlist item not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Removed from wishlist'
    });
  } catch (err: any) {
    console.error('❌ Remove From Wishlist Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to remove from wishlist',
      context: 'wishlist/removeFromWishlist',
    });
  }
};

// GET /api/wishlist/check/:productId - Check if product is in wishlist
export const checkWishlist = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { productId } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      'SELECT id FROM wishlist WHERE student_id = $1 AND product_id = $2',
      [studentId, productId]
    );

    res.json({
      success: true,
      is_in_wishlist: result.rows.length > 0
    });
  } catch (err: any) {
    console.error('❌ Check Wishlist Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to check wishlist',
      context: 'wishlist/checkWishlist',
    });
  }
};
