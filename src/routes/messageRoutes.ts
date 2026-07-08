// src/routes/messageRoutes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  sendProductMessage,
  getProductMessages,
  getSellerInboxController,
  markMessagesAsReadController
} from '../controllers/messageController.js';

const router = Router();

// All message routes require authentication
router.use(authMiddleware);

// POST /api/messages/product - Send a message for a product
router.post('/product', sendProductMessage);

// GET /api/messages/product/:productId - Get messages for a product
router.get('/product/:productId', getProductMessages);

// POST /api/messages/mark-read/:productId - Mark messages as read for a product
router.post('/mark-read/:productId', markMessagesAsReadController);

// GET /api/messages/inbox - Get seller's inbox
router.get('/inbox', getSellerInboxController);

export default router;
