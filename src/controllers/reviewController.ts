// src/controllers/reviewController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import { ReviewModel, ProductReview, CreateReviewData } from '../models/reviewModel.js';

// GET: Get all reviews for a product (with nested replies)
export const getProductReviews = async (req: Request<{ productId?: string; id?: string }>, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId || req.params.id;
    const productIdNum = parseInt(productId!, 10);

    if (isNaN(productIdNum)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    // Extract pagination parameters from query
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await ReviewModel.getProductReviews(productIdNum, page, limit);

    res.status(200).json({
      success: true,
      reviews: result.reviews,
      total: result.total,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('❌ Error fetching product reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product reviews',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST: Create a new review or reply
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { product_id, rating, comment, parent_id } = req.body;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Validate required fields
    if (!product_id || !comment) {
      res.status(400).json({
        success: false,
        error: 'Product ID and comment are required'
      });
      return;
    }

    // Rating is required only for top-level reviews (not replies)
    if (!parent_id && (rating === undefined || rating === null)) {
      res.status(400).json({
        success: false,
        error: 'Rating is required for reviews'
      });
      return;
    }

    // Check permissions based on whether this is a review or reply
    if (!parent_id) {
      // Top-level review: check if user can review this product
      const canReview = await ReviewModel.canUserReviewProduct(studentId, product_id);
      if (!canReview) {
        res.status(403).json({
          success: false,
          error: 'You are not authorized to review this product'
        });
        return;
      }
    } else {
      // Reply: check if user can reply to this comment
      const canReply = await ReviewModel.canReplyToComment(parent_id);
      if (!canReply) {
        res.status(403).json({
          success: false,
          error: 'You cannot reply to this comment'
        });
        return;
      }
    }

    // If this is a reply, check if parent review exists and belongs to the same product
    if (parent_id) {
      const client = await pool.connect();
      try {
        const parentQuery = `
          SELECT id, product_id, depth FROM product_reviews
          WHERE id = $1
        `;
        const parentResult = await client.query(parentQuery, [parent_id]);

        if (parentResult.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Parent review not found'
          });
          return;
        }

        if (parentResult.rows[0].product_id !== product_id) {
          res.status(400).json({
            success: false,
            error: 'Parent review does not belong to this product'
          });
          return;
        }

        // Check max depth (3 levels: depth 0, 1, 2)
        const parentDepth = parentResult.rows[0].depth || 0;
        if (parentDepth >= 2) {
          res.status(400).json({
            success: false,
            error: 'Cannot nest comments more than 3 levels deep. This comment is already at maximum nesting level.'
          });
          return;
        }
      } finally {
        client.release();
      }
    }

    const reviewData: CreateReviewData = {
      product_id,
      student_id: studentId,
      rating: parent_id ? 0 : rating,
      comment,
      title: parent_id ? 'Reply' : 'Review'
    };

    const review = await ReviewModel.createReview(reviewData);

    // Update product rating after creating review
    await ReviewModel.updateProductRating(product_id);

    res.status(201).json({
      success: true,
      message: parent_id ? 'Reply added successfully' : 'Review added successfully',
      review
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT: Update a review or reply
export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(501).json({
    success: false,
    error: 'Update functionality not yet implemented'
  });
};

// DELETE: Delete a review and its replies
export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { reviewId } = req.params;
    const reviewIdNum = parseInt(reviewId, 10);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (isNaN(reviewIdNum)) {
      res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
      return;
    }

    // Check if the review exists and belongs to the authenticated user
    const client = await pool.connect();
    try {
      const ownershipQuery = `
        SELECT id, student_id FROM product_reviews
        WHERE id = $1
      `;
      const ownershipResult = await client.query(ownershipQuery, [reviewIdNum]);

      if (ownershipResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Review not found'
        });
        return;
      }

      if (ownershipResult.rows[0].student_id !== studentId) {
        res.status(403).json({
          success: false,
          error: 'You can only delete your own reviews'
        });
        return;
      }

      // Delete the review
      await ReviewModel.deleteReview(reviewIdNum);

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Check if user can review a product
export const canUserReviewProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    const canReview = await ReviewModel.canUserReviewProduct(studentId, productId);

    res.status(200).json({
      success: true,
      canReview
    });
  } catch (error) {
    console.error('❌ Error checking review permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check review permission',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Get user's review for a product
export const getUserReviewForProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    const review = await ReviewModel.getUserReviewForProduct(studentId, productId);

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('❌ Error fetching user review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
