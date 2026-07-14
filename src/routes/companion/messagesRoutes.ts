import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getMessagesController, markMessagesReadController, sendMessageController } from '../../controllers/companion/messagesController.js';

export const messagesRoutes = Router();

messagesRoutes.post('/messages', authMiddleware, sendMessageController);
messagesRoutes.get('/messages/:bookingId', authMiddleware, getMessagesController);
messagesRoutes.patch('/messages/:bookingId/read', authMiddleware, markMessagesReadController);

