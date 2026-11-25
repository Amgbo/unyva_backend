import {
  createBooking,
  deleteBooking,
  getBookingById,
  getBookingsByFreshmanId,
  getBookingsByGuideId,
  setBookingStatus,
  updateBookingDetails,
  updateBookingForCompletion,
  type Booking,
  type BookingStatus,
} from '../../models/companion/bookingModel.js';
import { getGuideById } from '../../models/companion/guideModel.js';

/**
 * Error carrying an HTTP status and a message that is safe to show the user.
 * Controllers translate it into a response instead of a generic 400/500.
 */
export class BookingAccessError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = 'BookingAccessError';
  }
}

function assertStatus(current: BookingStatus, allowed: BookingStatus[]) {
  if (!allowed.includes(current)) {
    throw new BookingAccessError(409, `This booking is already ${current}`);
  }
}

function sameId(a: unknown, b: unknown): boolean {
  return a != null && b != null && String(a) === String(b);
}

export async function createNewBooking(params: {
  freshman_id: string;
  guide_id: string;
  help_category: string;
  preferred_date: string;
  preferred_time: string;
  message?: string | null;
}): Promise<Booking> {
  // Resolve the target guide (accepts a guide id or a guide's student_id).
  const guide = await getGuideById(params.guide_id);
  if (!guide || guide.is_active === false) {
    throw new BookingAccessError(404, 'Guide not found');
  }

  // Prevent a guide from booking themselves.
  if (sameId(guide.student_id, params.freshman_id)) {
    throw new BookingAccessError(403, 'You cannot book yourself as a guide');
  }

  // Always store the canonical guide id.
  return createBooking({ ...params, guide_id: guide.id });
}

export async function getBookingsForGuide(guideId: string, requesterId: string): Promise<Booking[]> {
  const guide = await getGuideById(guideId);
  if (!guide) throw new BookingAccessError(404, 'Guide not found');
  if (!sameId(guide.student_id, requesterId)) {
    throw new BookingAccessError(403, 'You can only view bookings for your own guide profile');
  }
  return getBookingsByGuideId(guide.id);
}

export async function getMyBookings(freshmanId: string): Promise<Booking[]> {
  return getBookingsByFreshmanId(freshmanId);
}

export async function getBookingDetails(bookingId: string, requesterId: string): Promise<Booking> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new BookingAccessError(404, 'Booking not found');
  if (!sameId(booking.freshman_id, requesterId) && !sameId(booking.guide_student_id, requesterId)) {
    // Don't reveal that the booking exists to unrelated users.
    throw new BookingAccessError(404, 'Booking not found');
  }
  return booking;
}

export async function acceptBooking(params: { bookingId: string; guide_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) throw new BookingAccessError(404, 'Booking not found');

  // Validate that the accepting user owns the guide the booking is for.
  const guide = await getGuideById(booking.guide_id);
  if (!guide || !sameId(guide.student_id, params.guide_id)) {
    throw new BookingAccessError(403, 'You can only accept bookings for your own guides');
  }
  assertStatus(booking.status, ['pending']);

  return setBookingStatus({ bookingId: params.bookingId, status: 'accepted', guideId: booking.guide_id });
}

export async function declineBooking(params: { bookingId: string; guide_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) throw new BookingAccessError(404, 'Booking not found');

  const guide = await getGuideById(booking.guide_id);
  if (!guide || !sameId(guide.student_id, params.guide_id)) {
    throw new BookingAccessError(403, 'You can only decline bookings for your own guides');
  }
  assertStatus(booking.status, ['pending']);

  return setBookingStatus({ bookingId: params.bookingId, status: 'declined', guideId: booking.guide_id });
}

export async function cancelBooking(params: { bookingId: string; freshman_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) throw new BookingAccessError(404, 'Booking not found');
  if (!sameId(booking.freshman_id, params.freshman_id)) {
    throw new BookingAccessError(403, 'Only the student who made this booking can cancel it');
  }
  assertStatus(booking.status, ['pending', 'accepted']);
  return setBookingStatus({ bookingId: params.bookingId, status: 'cancelled', freshmanId: params.freshman_id });
}

export async function removeBooking(params: { bookingId: string; freshman_id: string }): Promise<Booking | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) return null;
  if (!sameId(booking.freshman_id, params.freshman_id)) {
    throw new BookingAccessError(403, 'Only the student who made this booking can delete it');
  }
  return deleteBooking({ bookingId: params.bookingId, freshmanId: params.freshman_id });
}

export async function completeBooking(params: { bookingId: string; completedBy: string }): Promise<Booking | null> {
  // Simple: any completion will set booking to completed.
  return updateBookingForCompletion(params);
}

export async function updateBooking(params: {
  bookingId: string;
  userId: string;
  help_category?: string;
  preferred_date?: string;
  preferred_time?: string;
  message?: string | null;
}): Promise<any | null> {
  const booking = await getBookingById(params.bookingId);
  if (!booking) throw new BookingAccessError(404, 'Booking not found');

  if (!sameId(booking.freshman_id, params.userId)) {
    throw new BookingAccessError(403, 'Only the student who made this booking can edit it');
  }

  if (booking.status === 'completed' || booking.status === 'cancelled') {
    throw new BookingAccessError(409, `Cannot edit a booking that is already ${booking.status}`);
  }

  return updateBookingDetails({
    bookingId: params.bookingId,
    help_category: params.help_category,
    preferred_date: params.preferred_date,
    preferred_time: params.preferred_time,
    message: params.message,
  });
}
