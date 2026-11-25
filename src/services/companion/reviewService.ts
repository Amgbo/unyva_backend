import {
  getReviewsForGuide,
  getReviewsForGuides,
  submitReviewForBooking,
  type Review,
} from '../../models/companion/reviewModel.js';
import { getGuideById, getGuidesByStudentId, updateGuideRating } from '../../models/companion/guideModel.js';
import { getBookingById } from '../../models/companion/bookingModel.js';
import { getSessionById } from '../../models/companion/sessionModel.js';
import { BookingAccessError } from './bookingService.js';

// Bookings that represent a real (or agreed) meeting with the guide. Nothing in
// the app marks bookings "completed" yet, so "accepted" must also qualify.
const REVIEWABLE_STATUSES = ['accepted', 'completed'];

/**
 * Submit a review for a guide. The reviewer must be the student on an
 * accepted/completed booking with that guide; one review per booking.
 */
export async function submitGuideReview(params: {
  reviewer_id: string;
  booking_id?: string | null;
  session_id?: string | null;
  guide_id?: string | null;
  rating: number;
  comment?: string | null;
}): Promise<{ review: Review; guideStudentId: string | null; guideId: string }> {
  const { reviewer_id, rating } = params;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BookingAccessError(400, 'Rating must be a whole number from 1 to 5');
  }

  const comment = typeof params.comment === 'string' ? params.comment.trim().slice(0, 2000) || null : null;

  // Resolve the booking (from booking_id, or from a session_id for older clients).
  let bookingId = params.booking_id ? String(params.booking_id) : '';
  if (!bookingId && params.session_id) {
    const session = await getSessionById(String(params.session_id));
    if (session) bookingId = String(session.booking_id);
  }
  if (!bookingId) {
    throw new BookingAccessError(400, 'booking_id is required');
  }

  const booking = await getBookingById(bookingId);
  if (!booking || String(booking.freshman_id) !== String(reviewer_id)) {
    // Don't reveal other students' bookings.
    throw new BookingAccessError(404, 'Booking not found');
  }

  if (!REVIEWABLE_STATUSES.includes(booking.status)) {
    throw new BookingAccessError(409, 'You can only review a guide after they accept your booking');
  }

  // If the client named a guide, it must be the booking's guide.
  if (params.guide_id) {
    const named = await getGuideById(String(params.guide_id));
    if (!named || String(named.id) !== String(booking.guide_id)) {
      throw new BookingAccessError(400, 'This booking is not with that guide');
    }
  }

  if (booking.guide_student_id && String(booking.guide_student_id) === String(reviewer_id)) {
    throw new BookingAccessError(403, 'You cannot review yourself');
  }

  const review = await submitReviewForBooking({
    booking_id: String(booking.id),
    reviewer_id: String(reviewer_id),
    guide_id: String(booking.guide_id),
    rating,
    comment,
  });
  if (!review) {
    throw new BookingAccessError(409, 'You have already reviewed this booking');
  }

  await updateGuideRating(String(booking.guide_id));
  return {
    review,
    guideStudentId: booking.guide_student_id ? String(booking.guide_student_id) : null,
    guideId: String(booking.guide_id),
  };
}

/** Public reviews for a guide; accepts a guide id or the guide's student_id. */
export async function getGuideReviews(guideId: string): Promise<Review[]> {
  const guide = await getGuideById(guideId);
  if (!guide) return [];
  return getReviewsForGuide(guide.id);
}

/** Reviews received across all guide profiles owned by this student. */
export async function getReviewsForStudentGuides(studentId: string): Promise<Review[]> {
  const guides = await getGuidesByStudentId(studentId);
  return getReviewsForGuides(guides.map((g) => String(g.id)));
}
