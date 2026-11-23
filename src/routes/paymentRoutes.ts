import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { initializePayment, verifyPayment, getPaymentStatus, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Payment routes
// This router is mounted before the global express.json() (so the webhook can
// read raw bytes), so JSON routes must parse their own bodies.
router.post('/initialize', express.json(), authMiddleware, initializePayment);
router.post('/verify', express.json(), authMiddleware, verifyPayment);
router.get('/status/:studentId', authMiddleware, getPaymentStatus);

// Webhook route - must be placed before body-parser middleware in main app
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
