// src/routes/messageRoutes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  sendProductMessage,
  getProductMessages,
  getSellerInboxController,
  markMessagesAsReadController
} from '../controllers/messageController.js';
import {
  sendServiceMessage,
  getServiceThread,
  markServiceThreadReadController,
  getServiceInboxController,
} from '../controllers/serviceMessageController.js';

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

// Service conversations (one per service + customer)
// POST /api/messages/service - Send a message about a service
router.post('/service', sendServiceMessage);
// GET /api/messages/service-inbox - Service conversations for the current user
router.get('/service-inbox', getServiceInboxController);
// GET /api/messages/service/:serviceId?customerId= - Messages + service summary
router.get('/service/:serviceId', getServiceThread);
// POST /api/messages/service/:serviceId/read - Mark a service conversation read
router.post('/service/:serviceId/read', markServiceThreadReadController);

export default router;
