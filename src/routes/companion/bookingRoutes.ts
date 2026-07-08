import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  acceptBookingController,
  cancelBookingController,
  createBookingController,
  declineBookingController,
  getBookingDetailController,
  listBookingsForGuideController,
  listMyBookingsController,
} from '../../controllers/companion/bookingController.js';

export const bookingRoutes = Router();

bookingRoutes.post('/bookings', authMiddleware, createBookingController);
bookingRoutes.get('/bookings/mine', authMiddleware, listMyBookingsController);
bookingRoutes.get('/bookings/guide/:guideId', authMiddleware, listBookingsForGuideController);
bookingRoutes.get('/bookings/:id', authMiddleware, getBookingDetailController);
bookingRoutes.patch('/bookings/:id/accept', authMiddleware, acceptBookingController);
bookingRoutes.patch('/bookings/:id/decline', authMiddleware, declineBookingController);
bookingRoutes.patch('/bookings/:id/cancel', authMiddleware, cancelBookingController);

