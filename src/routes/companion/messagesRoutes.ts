import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  getDmInboxController,
  getDmThreadsController,
  getMessagesController,
  markMessagesReadController,
  sendMessageController,
} from '../../controllers/companion/messagesController.js';

export const messagesRoutes = Router();

messagesRoutes.post('/messages', authMiddleware, sendMessageController);
messagesRoutes.get('/messages/dm/inbox', authMiddleware, getDmInboxController);
messagesRoutes.get('/messages/dm/threads', authMiddleware, getDmThreadsController);
messagesRoutes.get('/messages/:bookingId', authMiddleware, getMessagesController);
messagesRoutes.patch('/messages/:bookingId/read', authMiddleware, markMessagesReadController);

