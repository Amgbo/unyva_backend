import { Request, Response } from 'express';
import { getGuideReviews, getReviewsForStudentGuides, submitGuideReview } from '../../services/companion/reviewService.js';
import { BookingAccessError } from '../../services/companion/bookingService.js';
import { notificationService } from '../../services/notificationService.js';
import { handleControllerError } from '../../utils/apiError.js';
import { getStudentDisplayName } from '../../utils/studentName.js';

// authMiddleware sets req.user; verifyToken sets req.student. Accept either.
function getStudentId(req: Request): string | undefined {
  const id = (req as any).student?.student_id || (req as any).user?.student_id;
  return id ? String(id) : undefined;
}

function handleReviewError(res: Response, e: unknown, opts: Parameters<typeof handleControllerError>[2]) {
  if (e instanceof BookingAccessError) {
    return res.status(e.status).json({ success: false, error: e.message, message: e.message });
  }
  return handleControllerError(res, e, opts);
}

export async function submitReviewController(req: Request, res: Response) {
  try {
    const reviewer_id = getStudentId(req);
    if (!reviewer_id) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body ?? {};
    const { review, guideStudentId, guideId } = await submitGuideReview({
      reviewer_id,
      booking_id: body.booking_id ?? null,
      session_id: body.session_id ?? null,
      guide_id: body.guide_id ?? null,
      rating: Number(body.rating),
      comment: body.comment ?? null,
    });

    // Notify the guide owner about the new review.
    if (guideStudentId) {
      try {
        await notificationService.createCompanionReviewNotification(
          guideStudentId,
          guideId,
          review.rating,
          await getStudentDisplayName(reviewer_id, 'A student')
        );
      } catch (notifyError) {
        console.error('[Companion] Failed to send review notification:', notifyError);
      }
    }

    return res.status(201).json({ review });
  } catch (e: any) {
    return handleReviewError(res, e, {
      statusCode: 400,
      publicError: 'Failed to submit review',
      context: 'companion/submitReview',
    });
  }
}

export async function getMyReviewsController(req: Request, res: Response) {
  try {
    const student_id = getStudentId(req);
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const reviews = await getReviewsForStudentGuides(student_id);
    return res.json({ reviews });
  } catch (e: any) {
    return handleReviewError(res, e, {
      statusCode: 400,
      publicError: 'Failed to fetch reviews',
      context: 'companion/getMyReviews',
    });
  }
}

export async function getGuideReviewsController(req: Request, res: Response) {
  try {
    const reviews = await getGuideReviews(req.params.guideId);
    return res.json({ reviews });
  } catch (e: any) {
    return handleReviewError(res, e, {
      statusCode: 400,
      publicError: 'Failed to fetch guide reviews',
      context: 'companion/getGuideReviews',
    });
  }
}
