import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { SellerReviewModel } from '../models/sellerReviewModel.js';

export class SellerReviewController {
  // Create a new seller review
  static async createReview(req: AuthRequest, res: Response) {
    try {
      const { deal_id, rating, comment }: { deal_id: number; rating: number; comment?: string } = req.body;
      const reviewer_id = req.user?.student_id;

      if (!reviewer_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const review = await SellerReviewModel.createReview({
        deal_id,
        reviewer_id,
        rating,
        comment
      });

      res.status(201).json({ review });
    } catch (error) {
      console.error('Error creating seller review:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Get reviews for a seller
  static async getSellerReviews(req: AuthRequest, res: Response) {
    try {
      const sellerId = req.params.sellerId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await SellerReviewModel.getSellerReviews(sellerId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching seller reviews:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get a specific review by ID
  static async getReviewById(req: AuthRequest, res: Response) {
    try {
      const reviewId = parseInt(req.params.id);
      const userId = req.user?.student_id;

      const review = await SellerReviewModel.getReviewById(reviewId);

      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }

      // Check if user can view this review (public or own review)
      if (review.reviewer_id !== userId && review.seller_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this review' });
      }

      res.json({ review });
    } catch (error) {
      console.error('Error fetching review:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update a review
  static async updateReview(req: AuthRequest, res: Response) {
    try {
      const reviewId = parseInt(req.params.id);
      const { rating, comment }: { rating?: number; comment?: string } = req.body;
      const userId = req.user?.student_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updatedReview = await SellerReviewModel.updateReview(reviewId, userId, { rating, comment });

      if (!updatedReview) {
        return res.status(404).json({ error: 'Review not found or unauthorized' });
      }

      res.json({ review: updatedReview });
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Delete a review
  static async deleteReview(req: AuthRequest, res: Response) {
    try {
      const reviewId = parseInt(req.params.id);
      const userId = req.user?.student_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const success = await SellerReviewModel.deleteReview(reviewId, userId);

      if (!success) {
        return res.status(404).json({ error: 'Review not found or unauthorized' });
      }

      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Check if user can review a deal
  static async canUserReviewDeal(req: AuthRequest, res: Response) {
    try {
      const dealId = parseInt(req.params.dealId);
      const userId = req.user?.student_id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const canReview = await SellerReviewModel.canUserReviewDeal(dealId, userId);
      res.json({ canReview });
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
