// recommendationRoutes.ts
import express from 'express';
import {
  getPersonalizedRecommendationsController,
  getTrendingItems,
  getRelatedItems
} from '../controllers/recommendationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All recommendation routes require authentication
router.use(authMiddleware);

// Get personalized recommendations for the authenticated user
router.get('/personalized', getPersonalizedRecommendationsController);

// Get trending products and services
router.get('/trending', getTrendingItems);

// Get related items (products or services)
router.get('/related/:itemId/:type', getRelatedItems);

export default router;
