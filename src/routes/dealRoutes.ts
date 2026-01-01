import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { DealController } from '../controllers/dealController.js';

const router = Router();

// All deal endpoints require authentication
router.use(authMiddleware);

// Create a new deal
router.post('/', DealController.createDeal);

// Get user's deals (buyer or seller)
router.get('/', DealController.getUserDeals);

// Get deal by id
router.get('/:id', DealController.getDealById);

// Confirm deal
router.put('/:id/confirm', DealController.confirmDeal);

// Delete deal
router.delete('/:id', DealController.deleteDeal);

export default router;
