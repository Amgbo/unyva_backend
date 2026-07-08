import { pool } from '../db.js';

export interface SellerReview {
  id: number;
  deal_id: number;
  reviewer_id: string;
  seller_id: string;
  rating: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSellerReviewData {
  deal_id: number;
  reviewer_id: string;
  rating: number;
  comment?: string;
}

export interface SellerReviewWithReviewer extends SellerReview {
  reviewer_name: string;
  reviewer_avatar?: string;
}

export class SellerReviewModel {
  // Create a new seller review
  static async createReview(reviewData: CreateSellerReviewData): Promise<SellerReview> {
    const { deal_id, reviewer_id, rating, comment } = reviewData;

    // Verify deal exists and is completed
    const dealQuery = `
      SELECT buyer_id, seller_id, buyer_confirmed, seller_confirmed
      FROM deals
      WHERE id = $1
    `;
    const dealResult = await pool.query(dealQuery, [deal_id]);

    if (dealResult.rows.length === 0) {
      throw new Error('Deal not found');
    }

    const deal = dealResult.rows[0];

    // Check if deal is completed
    if (!deal.buyer_confirmed || !deal.seller_confirmed) {
      throw new Error('Cannot review incomplete deal');
    }

    // Check if reviewer is the buyer
    if (deal.buyer_id !== reviewer_id) {
      throw new Error('Only the buyer can review the seller');
    }

    // Check if reviewer is not the seller
    if (deal.seller_id === reviewer_id) {
      throw new Error('Seller cannot review themselves');
    }

    // Check if review already exists for this deal
    const existingQuery = 'SELECT id FROM seller_reviews WHERE deal_id = $1 AND reviewer_id = $2';
    const existingResult = await pool.query(existingQuery, [deal_id, reviewer_id]);

    if (existingResult.rows.length > 0) {
      throw new Error('Review already exists for this deal');
    }

    const insertQuery = `
      INSERT INTO seller_reviews (deal_id, reviewer_id, seller_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    try {
      const result = await pool.query(insertQuery, [
        deal_id,
        reviewer_id,
        deal.seller_id,
        rating,
        comment || null
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating seller review:', error);
      throw error;
    }
  }

  // Get reviews for a seller
  static async getSellerReviews(sellerId: string, page: number = 1, limit: number = 10): Promise<{
    reviews: SellerReviewWithReviewer[];
    total: number;
    hasMore: boolean;
    averageRating: number;
  }> {
    const offset = (page - 1) * limit;

    // Get reviews with reviewer info
    const reviewsQuery = `
      SELECT
        sr.*,
        CONCAT(s.first_name, ' ', s.last_name) as reviewer_name,
        s.profile_picture as reviewer_avatar
      FROM seller_reviews sr
      JOIN students s ON sr.reviewer_id = s.student_id
      WHERE sr.seller_id = $1
      ORDER BY sr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM seller_reviews WHERE seller_id = $1';

    // Get average rating
    const avgQuery = 'SELECT AVG(rating)::DECIMAL(3,2) as average FROM seller_reviews WHERE seller_id = $1';

    try {
      const [reviewsResult, countResult, avgResult] = await Promise.all([
        pool.query(reviewsQuery, [sellerId, limit, offset]),
        pool.query(countQuery, [sellerId]),
        pool.query(avgQuery, [sellerId])
      ]);

      const reviews = reviewsResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const hasMore = total > page * limit;
      const averageRating = parseFloat(avgResult.rows[0].average) || 0;

      return { reviews, total, hasMore, averageRating };
    } catch (error) {
      console.error('Error fetching seller reviews:', error);
      throw error;
    }
  }

  // Get review by ID
  static async getReviewById(reviewId: number): Promise<SellerReview | null> {
    const query = 'SELECT * FROM seller_reviews WHERE id = $1';
    const result = await pool.query(query, [reviewId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Update review (only comment and rating can be updated)
  static async updateReview(reviewId: number, reviewerId: string, updates: { rating?: number; comment?: string }): Promise<SellerReview | null> {
    // Verify ownership
    const review = await SellerReviewModel.getReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewer_id !== reviewerId) {
      throw new Error('Unauthorized to update this review');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.rating !== undefined) {
      fields.push(`rating = $${paramCount++}`);
      values.push(updates.rating);
    }
    if (updates.comment !== undefined) {
      fields.push(`comment = $${paramCount++}`);
      values.push(updates.comment);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(reviewId);

    const query = `
      UPDATE seller_reviews
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  // Delete review
  static async deleteReview(reviewId: number, reviewerId: string): Promise<boolean> {
    // Verify ownership
    const review = await SellerReviewModel.getReviewById(reviewId);
    if (!review) {
      return false;
    }

    if (review.reviewer_id !== reviewerId) {
      throw new Error('Unauthorized to delete this review');
    }

    const query = 'DELETE FROM seller_reviews WHERE id = $1';
    const result = await pool.query(query, [reviewId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Check if user can review a deal
  static async canUserReviewDeal(dealId: number, userId: string): Promise<boolean> {
    const query = `
      SELECT
        d.buyer_id,
        d.seller_id,
        d.buyer_confirmed,
        d.seller_confirmed,
        sr.id as review_exists
      FROM deals d
      LEFT JOIN seller_reviews sr ON d.id = sr.deal_id AND sr.reviewer_id = $2
      WHERE d.id = $1
    `;

    try {
      const result = await pool.query(query, [dealId, userId]);

      if (result.rows.length === 0) {
        return false; // Deal doesn't exist
      }

      const row = result.rows[0];

      // Must be the buyer
      if (row.buyer_id !== userId) {
        return false;
      }

      // Deal must be completed
      if (!row.buyer_confirmed || !row.seller_confirmed) {
        return false;
      }

      // Review must not already exist
      if (row.review_exists) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return false;
    }
  }
}
