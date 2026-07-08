import { Request, Response } from 'express';
import { getGuideReviews, submitGuideReview } from '../../services/companion/reviewService.js';

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

    return res.status(201).json({ review });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to submit review' });
  }
}

export async function getMyReviewsController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const reviews = await getGuideReviews(student_id);
    return res.json({ reviews });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to fetch reviews' });
  }
}

export async function getGuideReviewsController(req: Request, res: Response) {
  try {
    const reviews = await getGuideReviews(req.params.guideId);
    return res.json({ reviews });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to fetch guide reviews' });
  }
}

