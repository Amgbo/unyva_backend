import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { confirmSessionController, endSessionController, startSessionController } from '../../controllers/companion/sessionController.js';

export const sessionRoutes = Router();

sessionRoutes.post('/sessions/:bookingId/start', authMiddleware, startSessionController);
sessionRoutes.patch('/sessions/:id/confirm', authMiddleware, confirmSessionController);
sessionRoutes.patch('/sessions/:id/end', authMiddleware, endSessionController);

