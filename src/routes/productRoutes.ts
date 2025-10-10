// src/routes/productRoutes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllAvailableProducts,
  getProduct,
  getMyProducts,
  createNewProduct,
  updateExistingProduct,
  archiveExistingProduct,
  confirmDelivered,
  searchAndFilterProducts,
  getFeaturedProductsController,
  getProductsByCategoryController,
  getProductSuggestionsController,
  getSearchFiltersController,
  getPopularSearchesController,
  getRelatedProductsController
} from '../controllers/productController.js';
import {
  getProductReviews,
  createReview,
  deleteReview,
  canUserReviewProduct,
  getUserReviewForProduct
} from '../controllers/reviewController.js';

const router = Router();

// Public routes (no authentication required)
router.get('/', getAllAvailableProducts);
router.get('/search', searchAndFilterProducts);
router.get('/search/popular', getPopularSearchesController);
router.get('/featured', getFeaturedProductsController);
router.get('/category/:category', getProductsByCategoryController);
router.get('/filters', getSearchFiltersController);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProductsController);

// Protected routes (authentication required)
router.get('/my/listings', authMiddleware, getMyProducts);
router.get('/my/suggestions', authMiddleware, getProductSuggestionsController);
router.post('/', authMiddleware, createNewProduct);
router.put('/:id', authMiddleware, updateExistingProduct);
router.put('/:id/confirm-delivered', authMiddleware, confirmDelivered);
router.delete('/:id', authMiddleware, archiveExistingProduct);

// Reviews routes
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', authMiddleware, createReview);
router.delete('/:id/reviews/:reviewId', authMiddleware, deleteReview);
router.get('/:id/reviews/can-review', authMiddleware, canUserReviewProduct);
router.get('/:id/reviews/my-review', authMiddleware, getUserReviewForProduct);

export default router;
