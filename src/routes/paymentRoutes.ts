import express from 'express';
import { initializePayment, verifyPayment, getPaymentStatus, handleWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// Payment routes
router.post('/initialize', initializePayment);
router.get('/verify', verifyPayment);
router.get('/status/:studentId', getPaymentStatus);

// Webhook route - must be placed before body-parser middleware in main app
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
