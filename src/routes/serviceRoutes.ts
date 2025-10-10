import { Router, Request, Response } from 'express';
import {
  getService,
  getMyServices,
  getServices,
  createNewService,
  updateExistingService,
  deleteExistingService,
  getServiceReviewsController,
  getRelatedServicesController,
  getProviderStatsController,
  createBookingController,
  getProviderBookingsController,
  getBuyerBookingsController,
  updateBookingStatusController,
  getNotificationsController,
  markNotificationReadController,
  createReviewController,
  deleteServiceReviewController,
  canUserReviewServiceController,
  getUserReviewForServiceController,
  getFeaturedServicesController
} from '../controllers/serviceController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.get('/', getServices);
router.get('/featured', getFeaturedServicesController);
router.get('/:id', getService);
router.get('/:id/reviews', getServiceReviewsController);

// Protected routes (require authentication)
router.use(verifyToken);

// Service management
router.post('/', createNewService);
router.put('/:id', updateExistingService);
router.delete('/:id', deleteExistingService);
router.get('/provider/my-services', getMyServices);
router.get('/provider/stats', getProviderStatsController);

// Bookings
router.post('/bookings', createBookingController);
router.get('/provider/bookings', getProviderBookingsController);
router.get('/buyer/bookings', getBuyerBookingsController);
router.put('/bookings/:booking_id/status', updateBookingStatusController);

// Notifications
router.get('/notifications', getNotificationsController);
router.put('/notifications/:notification_id/read', markNotificationReadController);

// Reviews
router.post('/reviews', createReviewController);
router.post('/:id/reviews', createReviewController);
router.delete('/:id/reviews/:reviewId', deleteServiceReviewController);
router.get('/:id/reviews/can-review', canUserReviewServiceController);
router.get('/:id/reviews/my-review', getUserReviewForServiceController);

export default router;
