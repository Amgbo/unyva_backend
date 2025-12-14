import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import {
  getService,
  getMyServices,
  getServices,
  createNewService,
  updateExistingService,
  deleteExistingService,
  getServiceReviewsController,
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

/* ------------------------------------
   PUBLIC ROUTES
------------------------------------ */
router.get('/', getServices);
router.get('/featured', getFeaturedServicesController);

/* ⚠️ DO NOT PUT /:id BEFORE OTHER ROUTES 
   It will catch everything and break path-to-regexp
*/

/* ------------------------------------
   PROTECTED ROUTES
------------------------------------ */
router.use(verifyToken);

/* Service management */
// Accept up to 5 images under field 'images' for service creation/update
const upload = createMulter(undefined, 'services');
router.post('/', upload.array('images', 5), createNewService);
router.get('/provider/my-services', getMyServices);
router.get('/provider/stats', getProviderStatsController);
router.put('/:id', upload.array('images', 5), updateExistingService);
router.delete('/:id', deleteExistingService);

/* Bookings */
router.post('/bookings', createBookingController);
router.get('/provider/bookings', getProviderBookingsController);
router.get('/buyer/bookings', getBuyerBookingsController);
router.put('/bookings/:booking_id/status', updateBookingStatusController);

/* Notifications */
router.get('/notifications', getNotificationsController);
router.put('/notifications/:notification_id/read', markNotificationReadController);

/* Reviews */
router.post('/reviews', createReviewController);

/* Add these BEFORE /:id */
router.get('/:id/reviews', getServiceReviewsController);
router.post('/:id/reviews', createReviewController);
router.get('/:id/reviews/can-review', canUserReviewServiceController);
router.get('/:id/reviews/my-review', getUserReviewForServiceController);
router.delete('/:id/reviews/:reviewId', deleteServiceReviewController);

/* ------------------------------------
   PLACE /:id AT THE BOTTOM
------------------------------------ */
router.get('/:id', getService);

export default router;
