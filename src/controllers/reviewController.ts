import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// POST /api/reviews - Create a review
export const createReview = async (req: any, res: Response): Promise<void> => {

  try {
    const studentId = req.user?.student_id;
    const { product_id, seller_id, rating, comment } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!product_id || !seller_id || !rating) {
      res.status(400).json({ error: 'Product ID, seller ID, and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    // Check if user has purchased from this seller
    const orderResult = await pool.query(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.student_id = $1 AND oi.seller_id = $2 AND o.status IN ('completed', 'delivered')
       LIMIT 1`,
      [studentId, seller_id]
    );

    if (orderResult.rows.length === 0) {
      res.status(403).json({ error: 'You can only review sellers you have purchased from' });
      return;
    }

    // Check if already reviewed
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE reviewer_id = $1 AND seller_id = $2',
      [studentId, seller_id]
    );

    if (existingReview.rows.length > 0) {
      res.status(409).json({ error: 'You have already reviewed this seller' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, seller_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [studentId, seller_id, product_id, rating, comment || null]
    );

    res.status(201).json({
      success: true,
      review: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Create Review Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to create review',
      context: 'review/createReview',
    });
  }
};

// GET /api/reviews/seller/:sellerId - Get reviews for a seller
export const getSellerReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sellerId } = req.params;

    const result = await pool.query(
      `SELECT r.*, s.first_name as reviewer_first_name, s.last_name as reviewer_last_name
       FROM reviews r
       JOIN students s ON r.reviewer_id = s.student_id
       WHERE r.seller_id = $1
       ORDER BY r.created_at DESC`,
      [sellerId]
    );

    // Calculate average rating
    const avgResult = await pool.query(
      'SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE seller_id = $1',
      [sellerId]
    );

    res.status(200).json({
      success: true,
      reviews: result.rows,
      average_rating: parseFloat(avgResult.rows[0].average_rating) || 0,
      total_reviews: parseInt(avgResult.rows[0].total_reviews)
    });
  } catch (err: any) {
    console.error('❌ Get Seller Reviews Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch seller reviews',
      context: 'review/getSellerReviews',
    });
  }
};

// GET /api/reviews/my - Get reviews written by current user
export const getMyReviews = async (req: any, res: Response): Promise<void> => {  

  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT r.*, s.first_name as seller_first_name, s.last_name as seller_last_name
       FROM reviews r
       JOIN students s ON r.seller_id = s.student_id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      reviews: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get My Reviews Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch your reviews',
      context: 'review/getMyReviews',
    });
  }
};

// ---------------------------------------------------------------------------
// Legacy/backward-compatible exports required by src/routes/productRoutes.ts
// and src/routes/reviewRoutes.ts
// ---------------------------------------------------------------------------

// Legacy name: getProductReviews
export const getProductReviews = getSellerReviews;

// Legacy CRUD names expected by productRoutes/reviewRoutes
export const updateReview = async (req: any, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user?.student_id;
    const { reviewId, id } = req.params; // support both shapes
    const rid = reviewId ?? id;

    const { rating, comment } = req.body;

    if (!reviewerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!rid) {
      res.status(400).json({ error: 'Review ID is required' });
      return;
    }

    const result = await pool.query(
      `
      UPDATE reviews
      SET rating = COALESCE($1, rating),
          comment = COALESCE($2, comment)
      WHERE id = $3 AND reviewer_id = $4
      RETURNING *
      `,
      [rating ?? null, comment ?? null, rid, reviewerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.status(200).json({ success: true, review: result.rows[0] });
  } catch (err: any) {
    console.error('❌ Update Review Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update review',
      context: 'review/updateReview',
    });
  }
};

export const deleteReview = async (req: any, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user?.student_id;
    const { reviewId, id } = req.params;
    const rid = reviewId ?? id;

    if (!reviewerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!rid) {
      res.status(400).json({ error: 'Review ID is required' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND reviewer_id = $2 RETURNING *',
      [rid, reviewerId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (err: any) {
    console.error('❌ Delete Review Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete review',
      context: 'review/deleteReview',
    });
  }
};

// Legacy permission check
export const canUserReviewProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { sellerId, productId, id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Routes use sellerId/productId; we only need seller_id for this implementation.
    const seller_id = sellerId ?? req.body?.seller_id ?? req.query?.seller_id ?? id;
    if (!seller_id) {
      res.status(400).json({ error: 'sellerId is required' });
      return;
    }

    const orderResult = await pool.query(
      `
      SELECT o.id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.student_id = $1 AND oi.seller_id = $2 AND o.status IN ('completed', 'delivered')
      LIMIT 1
      `,
      [studentId, seller_id]
    );

    if (orderResult.rows.length === 0) {
      res.status(200).json({ success: true, can_review: false });
      return;
    }

    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE reviewer_id = $1 AND seller_id = $2',
      [studentId, seller_id]
    );

    res.status(200).json({ success: true, can_review: existingReview.rows.length === 0 });
  } catch (err: any) {
    console.error('❌ canUserReviewProduct Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to check review permission',
      context: 'review/canUserReviewProduct',
    });
  }
};

export const getUserReviewForProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { sellerId } = req.params;
    const seller_id = sellerId ?? req.body?.seller_id ?? req.query?.seller_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!seller_id) {
      res.status(400).json({ error: 'sellerId is required' });
      return;
    }

    const result = await pool.query(
      `
      SELECT *
      FROM reviews
      WHERE reviewer_id = $1 AND seller_id = $2
      LIMIT 1
      `,
      [studentId, seller_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.status(200).json({ success: true, review: result.rows[0] });
  } catch (err: any) {
    console.error('❌ getUserReviewForProduct Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch user review',
      context: 'review/getUserReviewForProduct',
    });
  }
};
