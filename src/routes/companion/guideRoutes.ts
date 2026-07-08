import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  getGuideByIdController,
  listGuidesController,
  getMyGuideController,
  getMyGuidesController,
  getMyDashboardController,
  registerGuideController,
  toggleAvailabilityController,
  updateMyGuideController,
} from '../../controllers/companion/guideController.js';

export const guideRoutes = Router();

guideRoutes.post('/guides/register', authMiddleware, registerGuideController);
guideRoutes.get('/guides', listGuidesController);
guideRoutes.get('/guides/me', authMiddleware, getMyGuideController);
guideRoutes.get('/guides/me/all', authMiddleware, getMyGuidesController);
guideRoutes.get('/guides/me/dashboard', authMiddleware, getMyDashboardController);
guideRoutes.put('/guides/me', authMiddleware, updateMyGuideController);
guideRoutes.patch('/guides/me/availability', authMiddleware, toggleAvailabilityController);
guideRoutes.get('/guides/:guideId', authMiddleware, getGuideByIdController);

