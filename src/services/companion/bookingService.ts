import {
  createBooking,
  getBookingById,
  getBookingsByFreshmanId,
  getBookingsByGuideId,
  setBookingStatus,
  updateBookingForCompletion,
  type Booking,
  type BookingStatus,
} from '../../models/companion/bookingModel.js';
import { getGuideById, getGuideByStudentId } from '../../models/companion/guideModel.js';

function assertStatus(current: BookingStatus, allowed: BookingStatus[]) {
  if (!allowed.includes(current)) {
    throw new Error(`Invalid status transition. Current: ${current}`);
  }
}

export async function createNewBooking(params: {
  freshman_id: string;
  guide_id: string;
  help_category: string;
  preferred_date: string;
  preferred_time: string;
  message?: string | null;
}): Promise<Booking> {
  // Prevent a guide from booking themselves.
  const ownGuide = await getGuideByStudentId(params.freshman_id);
  if (ownGuide && ownGuide.student_id === params.guide_id) {
    throw new Error('You cannot book yourself as a guide');
  }

  return createBooking(params);
}

export async function getBookingsForGuide(guideId: string): Promise<Booking[]> {
  return getBookingsByGuideId(guideId);
}

export async function getMyBookings(freshmanId: string): Promise<Booking[]> {
  return getBookingsByFreshmanId(freshmanId);
}

export async function getBookingDetails(bookingId: string): Promise<Booking | null> {
  return getBookingById(bookingId);
}

export async function acceptBooking(params: { bookingId: string; guide_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) return null;
  assertStatus(booking.status, ['pending']);

  // Validate that the accepting user owns the guide the booking is for.
  const guide = await getGuideById(booking.guide_id);
  if (!guide || guide.student_id !== params.guide_id) {
    throw new Error('You can only accept bookings for your own guides');
  }

  return setBookingStatus({ bookingId: params.bookingId, status: 'accepted', guideId: booking.guide_id });
}

export async function declineBooking(params: { bookingId: string; guide_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) return null;
  assertStatus(booking.status, ['pending']);

  const guide = await getGuideById(booking.guide_id);
  if (!guide || guide.student_id !== params.guide_id) {
    throw new Error('You can only decline bookings for your own guides');
  }

  return setBookingStatus({ bookingId: params.bookingId, status: 'declined', guideId: booking.guide_id });
}

export async function cancelBooking(params: { bookingId: string; freshman_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) return null;
  assertStatus(booking.status, ['pending', 'accepted']);
  return setBookingStatus({ bookingId: params.bookingId, status: 'cancelled', freshmanId: params.freshman_id });
}

export async function completeBooking(params: { bookingId: string; completedBy: string }): Promise<Booking | null> {
  // Simple: any completion will set booking to completed.
  return updateBookingForCompletion(params);
}

