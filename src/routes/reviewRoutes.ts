import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  canUserReviewProduct,
  getUserReviewForProduct
} from '../controllers/reviewController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to get reviews for a product
router.get('/:productId', getProductReviews);

// Authenticated routes
router.post('/', authMiddleware, createReview);
router.put('/:id', authMiddleware, updateReview);
router.delete('/:id', authMiddleware, deleteReview);
router.get('/:productId/can-review', authMiddleware, canUserReviewProduct);
router.get('/:productId/user-review', authMiddleware, getUserReviewForProduct);

export default router;
