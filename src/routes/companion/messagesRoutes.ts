import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getMessagesController, sendMessageController } from '../../controllers/companion/messagesController.js';

export const messagesRoutes = Router();

messagesRoutes.post('/messages', authMiddleware, sendMessageController);
messagesRoutes.get('/messages/:bookingId', authMiddleware, getMessagesController);

