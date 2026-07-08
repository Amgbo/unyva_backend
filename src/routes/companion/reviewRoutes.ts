import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getGuideReviewsController, getMyReviewsController, submitReviewController } from '../../controllers/companion/reviewController.js';

export const reviewRoutes = Router();

reviewRoutes.post('/reviews', authMiddleware, submitReviewController);
reviewRoutes.get('/reviews/me', authMiddleware, getMyReviewsController);
reviewRoutes.get('/reviews/guide/:guideId', authMiddleware, getGuideReviewsController);

