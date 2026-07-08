import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getDeliveryCodes,
  generateDeliveryCodes,
  revokeDeliveryCode
} from '../controllers/adminController.js';

const router = Router();

// Apply authentication to all admin routes
router.use(authMiddleware);

// Delivery Code Management Routes (Admin only)

// GET /api/admin/delivery-codes - Get all delivery codes
router.get('/delivery-codes', getDeliveryCodes);

// POST /api/admin/delivery-codes/generate - Generate new delivery codes
router.post('/delivery-codes/generate', generateDeliveryCodes);

// DELETE /api/admin/delivery-codes/:code - Revoke a delivery code
router.delete('/delivery-codes/:code', revokeDeliveryCode);

export { router as adminRouter };
