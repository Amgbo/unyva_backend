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
router.get('/:id\\d+', getService);
router.get('/:id\\d+/reviews', getServiceReviewsController);

// Protected routes (require authentication)
router.use(verifyToken);

// Service management
router.post('/', createNewService);
router.put('/:id\\d+', updateExistingService);
router.delete('/:id\\d+', deleteExistingService);
router.get('/provider/my-services', getMyServices);
router.get('/provider/stats', getProviderStatsController);

// Bookings
router.post('/bookings', createBookingController);
router.get('/provider/bookings', getProviderBookingsController);
router.get('/buyer/bookings', getBuyerBookingsController);
router.put('/bookings/:booking_id\\d+/status', updateBookingStatusController);

// Notifications
router.get('/notifications', getNotificationsController);
router.put('/notifications/:notification_id\\d+/read', markNotificationReadController);

// Reviews - protected routes
router.post('/reviews', createReviewController);
router.post('/:id\\d+/reviews', createReviewController);
router.delete('/:id\\d+/reviews/:reviewId\\d+', deleteServiceReviewController);
router.get('/:id\\d+/reviews/can-review', canUserReviewServiceController);
router.get('/:id\\d+/reviews/my-review', getUserReviewForServiceController);

export default router;
