// behaviorRoutes.ts
import express from 'express';
import {
  trackView,
  trackSearch,
  trackInteraction,
  getViewHistory,
  getSearchHistory,
  getPurchaseHistory,
  getInteractions
} from '../controllers/behaviorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All behavior routes require authentication
router.use(authMiddleware);

// Track product/service views
router.post('/track-view', trackView);

// Track search queries
router.post('/track-search', trackSearch);

// Track user interactions (like, favorite, cart_add, etc.)
router.post('/track-interaction', trackInteraction);

// Get user's view history
router.get('/view-history', getViewHistory);

// Get user's search history
router.get('/search-history', getSearchHistory);

// Get user's purchase history
router.get('/purchase-history', getPurchaseHistory);

// Get user's interactions
router.get('/interactions', getInteractions);

export default router;
