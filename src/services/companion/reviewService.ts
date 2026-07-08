import { getReviewsForGuide, submitReview, type Review } from '../../models/companion/reviewModel.js';

export async function submitGuideReview(params: {
  session_id: string;
  reviewer_id: string;
  guide_id: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  return submitReview(params);
}

export async function getGuideReviews(guideId: string): Promise<Review[]> {
  return getReviewsForGuide(guideId);
}

