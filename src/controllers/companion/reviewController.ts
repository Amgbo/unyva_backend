import { Request, Response } from 'express';
import { getGuideReviews, submitGuideReview } from '../../services/companion/reviewService.js';
import { getGuideById } from '../../models/companion/guideModel.js';
import { notificationService } from '../../services/notificationService.js';
import { handleControllerError } from '../../utils/apiError.js';
import { getStudentDisplayName } from '../../utils/studentName.js';

export async function submitReviewController(req: Request, res: Response) {
  try {
    const reviewer_id = (req as any).student?.student_id;
    if (!reviewer_id) return res.status(401).json({ error: 'Unauthorized' });

    const review = await submitGuideReview({
      session_id: req.body.session_id,
      reviewer_id,
      guide_id: req.body.guide_id,
      rating: Number(req.body.rating),
      comment: req.body.comment ?? null,
    });

    // Notify the guide owner about the new review.
    try {
      const guide = await getGuideById(req.body.guide_id);
      if (guide?.student_id) {
        await notificationService.createCompanionReviewNotification(
          guide.student_id,
          guide.id,
          Number(req.body.rating),
          await getStudentDisplayName(reviewer_id, 'A student')
        );
      }
    } catch (notifyError) {
      console.error('[Companion] Failed to send review notification:', notifyError);
    }

    return res.status(201).json({ review });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to submit review',
      context: 'companion/submitReview',
    });
  }
}

export async function getMyReviewsController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const reviews = await getGuideReviews(student_id);
    return res.json({ reviews });
  } catch (e: any) {
    return handleControllerError(res, e, {
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
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to fetch guide reviews',
      context: 'companion/getGuideReviews',
    });
  }
}
