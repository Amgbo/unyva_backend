// src/routes/messageRoutes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  sendProductMessage,
  getProductMessages,
  getSellerInboxController
} from '../controllers/messageController.js';

const router = Router();

// All message routes require authentication
router.use(authMiddleware);

// POST /api/messages/product - Send a message for a product
router.post('/product', sendProductMessage);

// GET /api/messages/product/:productId - Get messages for a product
router.get('/product/:productId', getProductMessages);

// GET /api/messages/inbox - Get seller's inbox
router.get('/inbox', getSellerInboxController);

export default router;
