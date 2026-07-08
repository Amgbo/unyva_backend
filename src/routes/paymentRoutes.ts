import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { initializePayment, verifyPayment, getPaymentStatus, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Payment routes
router.post('/initialize', authMiddleware, initializePayment);
router.post('/verify', authMiddleware, verifyPayment);
router.get('/status/:studentId', authMiddleware, getPaymentStatus);

// Webhook route - must be placed before body-parser middleware in main app
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
