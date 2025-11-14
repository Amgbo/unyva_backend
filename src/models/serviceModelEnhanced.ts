import { pool } from '../db.js';

// ===== INTERFACES =====

export interface ServiceReview {
  id: number;
  service_id: number;
  customer_id: string;
  provider_id: string;
  rating: number;
  title?: string;
  comment: string;
  is_verified: boolean;
  created_at: Date;
  updated_at?: Date;
  parent_id?: number;
  depth?: number;
  thread_root_id?: number;
  replies?: ServiceReview[];
}

export interface CreateServiceReviewData {
  service_id: number;
  customer_id: string;
  provider_id: string;
  rating: number;
  title?: string;
  comment: string;
  booking_id?: number;
  parent_id?: number;
}

export interface ServiceReviewWithStudent extends ServiceReview {
  customer_name: string;
  customer_avatar?: string;
}

export interface ThreadedServiceReviewResponse {
  reviews: ServiceReviewWithStudent[];
  total: number;
  hasMore: boolean;
}

// ===== CONSTANTS =====

const MAX_COMMENT_DEPTH = 2; // 0 = top-level, 1 = first reply, 2 = second reply (3 levels total)
const DEFAULT_PAGE_SIZE = 10;

// ===== SERVICE REVIEW MODEL =====

export class ServiceReviewModel {
  /**
   * Get all reviews for a service with nested replies recursively
   * Returns top-level reviews with their nested comment threads
   */
  static async getServiceReviews(
    serviceId: number,
    page: number = 1,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<ThreadedServiceReviewResponse> {
    const offset = (page - 1) * limit;

    // Get only top-level reviews with pagination
    const topLevelQuery = `
      SELECT
        sr.id,
        sr.service_id,
        sr.customer_id,
        sr.provider_id,
        sr.rating,
        sr.title,
        sr.comment,
        sr.is_verified,
        sr.created_at,
        sr.updated_at,
        sr.parent_id,
        sr.depth,
        sr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as customer_name,
        s.profile_picture as customer_avatar
      FROM service_reviews sr
      JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.service_id = $1 AND sr.parent_id IS NULL
      ORDER BY sr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Get all nested replies for the service (will be organized by parent_id)
    const allRepliesQuery = `
      SELECT
        sr.id,
        sr.service_id,
        sr.customer_id,
        sr.provider_id,
        sr.rating,
        sr.title,
        sr.comment,
        sr.is_verified,
        sr.created_at,
        sr.updated_at,
        sr.parent_id,
        sr.depth,
        sr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as customer_name,
        s.profile_picture as customer_avatar
      FROM service_reviews sr
      JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.service_id = $1 AND sr.parent_id IS NOT NULL
      ORDER BY sr.parent_id, sr.created_at ASC
    `;

    // Count total top-level reviews
    const countQuery = `
      SELECT COUNT(*) as total
      FROM service_reviews
      WHERE service_id = $1 AND parent_id IS NULL
    `;

    try {
      const [topLevelResult, allRepliesResult, countResult] = await Promise.all([
        pool.query(topLevelQuery, [serviceId, limit, offset]),
        pool.query(allRepliesQuery, [serviceId]),
        pool.query(countQuery, [serviceId])
      ]);

      const topLevelReviews = topLevelResult.rows;
      const allReplies = allRepliesResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const hasMore = total > page * limit;

      // Build nested structure
      const reviewsWithNestedReplies = topLevelReviews.map(review => {
        return {
          ...review,
          replies: ServiceReviewModel.buildCommentThread(review.id, allReplies)
        };
      });

      return {
        reviews: reviewsWithNestedReplies,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching service reviews:', error);
      throw error;
    }
  }

  /**
   * Build nested comment thread recursively
   * Takes all comments and organizes them by parent_id relationship
   */
  private static buildCommentThread(parentId: number, allComments: ServiceReviewWithStudent[]): ServiceReviewWithStudent[] {
    // Find all direct children of this parent
    const children = allComments.filter(c => c.parent_id === parentId);

    // Recursively build threads for each child
    return children.map(child => ({
      ...child,
      replies: ServiceReviewModel.buildCommentThread(child.id, allComments)
    }));
  }

  /**
   * Get all replies for a specific review (flat structure, not nested)
   * Useful for updating a single review with its replies
   */
  static async getReviewReplies(reviewId: number): Promise<ServiceReviewWithStudent[]> {
    const query = `
      SELECT
        sr.id,
        sr.service_id,
        sr.customer_id,
        sr.provider_id,
        sr.rating,
        sr.title,
        sr.comment,
        sr.is_verified,
        sr.created_at,
        sr.updated_at,
        sr.parent_id,
        sr.depth,
        sr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as customer_name,
        s.profile_picture as customer_avatar
      FROM service_reviews sr
      JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.parent_id = $1
      ORDER BY sr.created_at ASC
    `;

    try {
      const result = await pool.query(query, [reviewId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching review replies:', error);
      throw error;
    }
  }

  /**
   * Create a new review or reply
   */
  static async createReview(reviewData: CreateServiceReviewData): Promise<ServiceReview> {
    const {
      service_id,
      customer_id,
      provider_id,
      rating,
      title,
      comment,
      booking_id,
      parent_id
    } = reviewData;

    // Validate max depth if this is a reply
    if (parent_id) {
      const parentResult = await pool.query(
        'SELECT depth FROM service_reviews WHERE id = $1',
        [parent_id]
      );

      if (parentResult.rows.length === 0) {
        throw new Error('Parent review not found');
      }

      const parentDepth = parentResult.rows[0].depth;
      if (parentDepth >= MAX_COMMENT_DEPTH) {
        throw new Error(`Cannot nest comments more than ${MAX_COMMENT_DEPTH + 1} levels deep`);
      }
    }

    const query = `
      INSERT INTO service_reviews
      (service_id, customer_id, provider_id, rating, title, comment, booking_id, parent_id, depth, thread_root_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NULL)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        service_id,
        customer_id,
        provider_id,
        rating || null,
        title || null,
        comment,
        booking_id || null,
        parent_id || null
      ]);

      const review = result.rows[0];

      // Update provider rating after creating review
      if (!parent_id) {
        await ServiceReviewModel.updateProviderRating(provider_id);
      }

      return review;
    } catch (error) {
      console.error('Error creating service review:', error);
      throw error;
    }
  }

  /**
   * Update provider rating based on all reviews (excluding replies)
   */
  static async updateProviderRating(providerId: string): Promise<void> {
    const query = `
      UPDATE students
      SET
        service_provider_rating = COALESCE((
          SELECT AVG(rating)::NUMERIC(3,2)
          FROM service_reviews
          WHERE provider_id = $1 AND rating > 0 AND parent_id IS NULL
        ), 0),
        service_review_count = (
          SELECT COUNT(*)
          FROM service_reviews
          WHERE provider_id = $1 AND rating > 0 AND parent_id IS NULL
        )
      WHERE student_id = $1
    `;

    try {
      await pool.query(query, [providerId]);
    } catch (error) {
      console.error('Error updating provider rating:', error);
      throw error;
    }
  }

  /**
   * Check if user can review a service (top-level reviews only)
   * - User cannot review their own service
   * - User can only write one top-level review per service
   */
  static async canUserReviewService(studentId: string, serviceId: number): Promise<boolean> {
    try {
      // Check if user is the service provider
      const providerResult = await pool.query(
        'SELECT student_id FROM services WHERE id = $1',
        [serviceId]
      );

      if (providerResult.rows.length === 0) {
        return false; // Service doesn't exist
      }

      if (providerResult.rows[0].student_id === studentId) {
        return false; // User is the provider - cannot create top-level reviews
      }

      // Check if user already has a top-level review
      const reviewResult = await pool.query(
        'SELECT id FROM service_reviews WHERE service_id = $1 AND customer_id = $2 AND parent_id IS NULL',
        [serviceId, studentId]
      );

      return reviewResult.rows.length === 0; // Can review if no existing top-level review
    } catch (error) {
      console.error('Error checking review permission:', error);
      throw error;
    }
  }

  /**
   * Check if user can reply to a review/comment
   * - Anyone can reply to reviews (including service providers)
   * - Must be a valid comment that can have replies (depth < MAX_COMMENT_DEPTH)
   */
  static async canUserReplyToComment(studentId: string, commentId: number): Promise<boolean> {
    try {
      // Check if the comment exists and get its depth
      const commentResult = await pool.query(
        'SELECT id, depth FROM service_reviews WHERE id = $1',
        [commentId]
      );

      if (commentResult.rows.length === 0) {
        return false; // Comment doesn't exist
      }

      const depth = commentResult.rows[0].depth || 0;
      return depth < MAX_COMMENT_DEPTH; // Can reply if not at max depth
    } catch (error) {
      console.error('Error checking reply permission:', error);
      return false;
    }
  }

  /**
   * Get user's top-level review for a specific service
   */
  static async getUserReviewForService(studentId: string, serviceId: number): Promise<ServiceReview | null> {
    const query = `
      SELECT *
      FROM service_reviews
      WHERE service_id = $1 AND customer_id = $2 AND parent_id IS NULL
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [serviceId, studentId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching user review:', error);
      throw error;
    }
  }

  /**
   * Update a review/comment (only comment text and title, not rating)
   */
  static async updateReview(
    reviewId: number,
    studentId: string,
    updates: { title?: string; comment?: string }
  ): Promise<ServiceReview> {
    const { title, comment } = updates;

    // Verify ownership
    const ownerResult = await pool.query(
      'SELECT customer_id FROM service_reviews WHERE id = $1',
      [reviewId]
    );

    if (ownerResult.rows.length === 0) {
      throw new Error('Review not found');
    }

    if (ownerResult.rows[0].customer_id !== studentId) {
      throw new Error('You can only update your own reviews');
    }

    let updateQuery = 'UPDATE service_reviews SET updated_at = CURRENT_TIMESTAMP';
    const values: (string | number)[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateQuery += `, title = $${paramCount++}`;
      values.push(title);
    }

    if (comment !== undefined) {
      updateQuery += `, comment = $${paramCount++}`;
      values.push(comment);
    }

    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(reviewId);

    try {
      const result = await pool.query(updateQuery, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  /**
   * Delete a review and all its nested replies (cascade)
   */
  static async deleteReview(reviewId: number, studentId: string): Promise<number> {
    // Verify ownership
    const ownerResult = await pool.query(
      'SELECT customer_id, provider_id, parent_id FROM service_reviews WHERE id = $1',
      [reviewId]
    );

    if (ownerResult.rows.length === 0) {
      throw new Error('Review not found');
    }

    const { customer_id: owner, provider_id, parent_id } = ownerResult.rows[0];

    if (owner !== studentId) {
      throw new Error('You can only delete your own reviews');
    }

    try {
      // Count descendants (all comments that will be deleted)
      const descendantCount = await ServiceReviewModel.countDescendants(reviewId);

      // Delete the review (CASCADE will handle all nested replies)
      await pool.query('DELETE FROM service_reviews WHERE id = $1', [reviewId]);

      // Update provider rating if this was a top-level review
      if (!parent_id) {
        await ServiceReviewModel.updateProviderRating(provider_id);
      }

      return descendantCount + 1; // Include the deleted review itself
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Count all descendants of a review (recursive)
   */
  private static async countDescendants(reviewId: number): Promise<number> {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id FROM service_reviews WHERE parent_id = $1
        UNION ALL
        SELECT sr.id FROM service_reviews sr
        INNER JOIN descendants d ON sr.parent_id = d.id
      )
      SELECT COUNT(*) as count FROM descendants
    `;

    try {
      const result = await pool.query(query, [reviewId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error counting descendants:', error);
      return 0;
    }
  }

  /**
   * Get a single review by ID with its full nested thread
   */
  static async getReviewById(reviewId: number): Promise<ServiceReviewWithStudent | null> {
    const query = `
      SELECT
        sr.id,
        sr.service_id,
        sr.customer_id,
        sr.provider_id,
        sr.rating,
        sr.title,
        sr.comment,
        sr.is_verified,
        sr.created_at,
        sr.updated_at,
        sr.parent_id,
        sr.depth,
        sr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as customer_name,
        s.profile_picture as customer_avatar
      FROM service_reviews sr
      JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.id = $1
    `;

    try {
      const result = await pool.query(query, [reviewId]);
      if (result.rows.length === 0) {
        return null;
      }

      const review = result.rows[0];

      // Get all replies recursively
      if (review.parent_id === null) {
        const allReplies = await ServiceReviewModel.getReviewReplies(reviewId);
        review.replies = ServiceReviewModel.buildCommentThread(reviewId, allReplies);
      }

      return review;
    } catch (error) {
      console.error('Error fetching review:', error);
      throw error;
    }
  }

  /**
   * Get comment depth (how many levels deep this comment is)
   */
  static async getCommentDepth(reviewId: number): Promise<number> {
    const query = `
      WITH RECURSIVE path AS (
        SELECT id, parent_id, 0 as depth FROM service_reviews WHERE id = $1
        UNION ALL
        SELECT sr.id, sr.parent_id, path.depth + 1
        FROM service_reviews sr
        INNER JOIN path ON sr.id = path.parent_id
      )
      SELECT MAX(depth) as max_depth FROM path
    `;

    try {
      const result = await pool.query(query, [reviewId]);
      return result.rows[0].max_depth || 0;
    } catch (error) {
      console.error('Error getting comment depth:', error);
      return 0;
    }
  }

  /**
   * Check if a comment can have replies (depth < MAX_COMMENT_DEPTH)
   */
  static async canReplyToComment(reviewId: number): Promise<boolean> {
    try {
      const depth = await ServiceReviewModel.getCommentDepth(reviewId);
      return depth < MAX_COMMENT_DEPTH;
    } catch (error) {
      console.error('Error checking reply permission:', error);
      return false;
    }
  }
}
