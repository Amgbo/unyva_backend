import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getDeliveryStats,
  getDeliveries,
  acceptDelivery,
  completeDelivery,
  getPendingDeliveries,
  getAvailableDeliveries
} from '../controllers/deliveryController.js';
import { requireDeliveryRole } from '../controllers/deliveryController.js';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Delivery person stats - requires delivery role
router.get('/stats', requireDeliveryRole, getDeliveryStats);

// Get delivery person's deliveries - requires delivery role
router.get('/', requireDeliveryRole, getDeliveries);

// Accept a delivery - requires delivery role
router.patch('/:id/accept', requireDeliveryRole, acceptDelivery);

// Complete a delivery - requires delivery role
router.patch('/:id/complete', requireDeliveryRole, completeDelivery);

// Get pending deliveries (for assignment) - requires delivery role
router.get('/pending', requireDeliveryRole, getPendingDeliveries);

// Get available deliveries (unassigned pending deliveries) - requires delivery role
router.get('/available', requireDeliveryRole, getAvailableDeliveries);

export default router;
