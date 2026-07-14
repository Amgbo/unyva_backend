import { getReviewsForGuide, submitReview, type Review } from '../../models/companion/reviewModel.js';
import { updateGuideRating } from '../../models/companion/guideModel.js';

export async function submitGuideReview(params: {
  session_id: string;
  reviewer_id: string;
  guide_id: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  const review = await submitReview(params);
  await updateGuideRating(params.guide_id);
  return review;
}

export async function getGuideReviews(guideId: string): Promise<Review[]> {
  return getReviewsForGuide(guideId);
}

