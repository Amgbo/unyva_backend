import { pool } from '../db.js';

// ===== INTERFACES =====

export interface ProductReview {
  id: number;
  product_id: number;
  student_id: string;
  rating: number;
  title: string;
  comment: string;
  is_verified: boolean;
  created_at: Date;
  updated_at?: Date;
  parent_id?: number;
  depth?: number;
  thread_root_id?: number;
  replies?: ProductReview[];
}

export interface CreateReviewData {
  product_id: number;
  student_id: string;
  rating: number;
  title: string;
  comment: string;
  order_id?: number;
  parent_id?: number;
}

export interface ReviewWithStudent extends ProductReview {
  student_name: string;
  student_avatar?: string;
}

export interface ThreadedReviewResponse {
  reviews: ReviewWithStudent[];
  total: number;
  hasMore: boolean;
}

// ===== CONSTANTS =====

const MAX_COMMENT_DEPTH = 2; // 0 = top-level, 1 = first reply, 2 = second reply (3 levels total)
const DEFAULT_PAGE_SIZE = 10;

// ===== REVIEW MODEL =====

export class ReviewModel {
  /**
   * Create product reviews table if it doesn't exist
   */
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        parent_id INTEGER REFERENCES product_reviews(id) ON DELETE CASCADE,
        depth INTEGER DEFAULT 0,
        thread_root_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_student_id ON product_reviews(student_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_id ON product_reviews(parent_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_depth ON product_reviews(depth);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_thread_root ON product_reviews(thread_root_id);
    `;

    try {
      await pool.query(query);
    } catch (error) {
      console.error('Error creating product_reviews table:', error);
      throw error;
    }
  }

  /**
   * Get all reviews for a product with nested replies recursively
   * Returns top-level reviews with their nested comment threads
   */
  static async getProductReviews(
    productId: number,
    page: number = 1,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<ThreadedReviewResponse> {
    const offset = (page - 1) * limit;

    // Get only top-level reviews with pagination
    const topLevelQuery = `
      SELECT
        pr.id,
        pr.product_id,
        pr.student_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.is_verified,
        pr.created_at,
        pr.updated_at,
        pr.parent_id,
        pr.depth,
        pr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        s.profile_picture as student_avatar
      FROM product_reviews pr
      JOIN students s ON pr.student_id = s.student_id
      WHERE pr.product_id = $1 AND pr.parent_id IS NULL
      ORDER BY pr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Get all nested replies for the product (will be organized by parent_id)
    const allRepliesQuery = `
      SELECT
        pr.id,
        pr.product_id,
        pr.student_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.is_verified,
        pr.created_at,
        pr.updated_at,
        pr.parent_id,
        pr.depth,
        pr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        s.profile_picture as student_avatar
      FROM product_reviews pr
      JOIN students s ON pr.student_id = s.student_id
      WHERE pr.product_id = $1 AND pr.parent_id IS NOT NULL
      ORDER BY pr.parent_id, pr.created_at ASC
    `;

    // Count total top-level reviews
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_reviews
      WHERE product_id = $1 AND parent_id IS NULL
    `;

    try {
      const [topLevelResult, allRepliesResult, countResult] = await Promise.all([
        pool.query(topLevelQuery, [productId, limit, offset]),
        pool.query(allRepliesQuery, [productId]),
        pool.query(countQuery, [productId])
      ]);

      const topLevelReviews = topLevelResult.rows;
      const allReplies = allRepliesResult.rows;
      const total = parseInt(countResult.rows[0].total);
      const hasMore = total > page * limit;

      // Build nested structure
      const reviewsWithNestedReplies = topLevelReviews.map(review => {
        return {
          ...review,
          replies: ReviewModel.buildCommentThread(review.id, allReplies)
        };
      });

      return {
        reviews: reviewsWithNestedReplies,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  /**
   * Build nested comment thread recursively
   * Takes all comments and organizes them by parent_id relationship
   */
  private static buildCommentThread(parentId: number, allComments: ReviewWithStudent[]): ReviewWithStudent[] {
    // Find all direct children of this parent
    const children = allComments.filter(c => c.parent_id === parentId);

    // Recursively build threads for each child
    return children.map(child => ({
      ...child,
      replies: ReviewModel.buildCommentThread(child.id, allComments)
    }));
  }

  /**
   * Get all replies for a specific review (flat structure, not nested)
   * Useful for updating a single review with its replies
   */
  static async getReviewReplies(reviewId: number): Promise<ReviewWithStudent[]> {
    const query = `
      SELECT
        pr.id,
        pr.product_id,
        pr.student_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.is_verified,
        pr.created_at,
        pr.updated_at,
        pr.parent_id,
        pr.depth,
        pr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        s.profile_picture as student_avatar
      FROM product_reviews pr
      JOIN students s ON pr.student_id = s.student_id
      WHERE pr.parent_id = $1
      ORDER BY pr.created_at ASC
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
  static async createReview(reviewData: CreateReviewData): Promise<ProductReview> {
    const {
      product_id,
      student_id,
      rating,
      title,
      comment,
      order_id,
      parent_id
    } = reviewData;

    // Validate max depth if this is a reply
    if (parent_id) {
      const parentResult = await pool.query(
        'SELECT depth FROM product_reviews WHERE id = $1',
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
      INSERT INTO product_reviews
      (product_id, student_id, rating, title, comment, order_id, parent_id, depth, thread_root_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NULL)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        product_id,
        student_id,
        rating || null,
        title || null,
        comment,
        order_id || null,
        parent_id || null
      ]);

      const review = result.rows[0];

      // Update product rating after creating review
      if (!parent_id) {
        await ReviewModel.updateProductRating(product_id);
      }

      return review;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Update product rating based on all reviews (excluding replies)
   */
  static async updateProductRating(productId: number): Promise<void> {
    const query = `
      UPDATE products
      SET
        rating = COALESCE((
          SELECT AVG(rating)::NUMERIC(3,2)
          FROM product_reviews
          WHERE product_id = $1 AND rating > 0 AND parent_id IS NULL
        ), 0),
        review_count = (
          SELECT COUNT(*)
          FROM product_reviews
          WHERE product_id = $1 AND rating > 0 AND parent_id IS NULL
        )
      WHERE id = $1
    `;

    try {
      await pool.query(query, [productId]);
    } catch (error) {
      console.error('Error updating product rating:', error);
      throw error;
    }
  }

  /**
   * Check if user can review a product (top-level reviews only)
   * - User cannot review their own product
   * - User can only write one top-level review per product
   */
  static async canUserReviewProduct(studentId: string, productId: number): Promise<boolean> {
    try {
      // Check if user is the product owner
      const ownerResult = await pool.query(
        'SELECT student_id FROM products WHERE id = $1',
        [productId]
      );

      if (ownerResult.rows.length === 0) {
        return false; // Product doesn't exist
      }

      if (ownerResult.rows[0].student_id === studentId) {
        return false; // User is the owner - cannot create top-level reviews
      }

      // Check if user already has a top-level review
      const reviewResult = await pool.query(
        'SELECT id FROM product_reviews WHERE product_id = $1 AND student_id = $2 AND parent_id IS NULL',
        [productId, studentId]
      );

      return reviewResult.rows.length === 0; // Can review if no existing top-level review
    } catch (error) {
      console.error('Error checking review permission:', error);
      throw error;
    }
  }

  /**
   * Check if user can reply to a review/comment
   * - Anyone can reply to reviews (including product owners)
   * - Must be a valid comment that can have replies (depth < MAX_COMMENT_DEPTH)
   */
  static async canUserReplyToComment(studentId: string, commentId: number): Promise<boolean> {
    try {
      // Check if the comment exists and get its depth
      const commentResult = await pool.query(
        'SELECT id, depth FROM product_reviews WHERE id = $1',
        [commentId]
      );

      if (commentResult.rows.length === 0) {
        return false; // Comment doesn't exist
      }

      const depth = commentResult.rows[0].depth || 0;
      return depth < MAX_COMMENT_DEPTH; // Can reply if not at max depth
    } catch (error) {
      console.error('Error checking reply permission:', error);
      throw error;
    }
  }

  /**
   * Get user's top-level review for a specific product
   */
  static async getUserReviewForProduct(studentId: string, productId: number): Promise<ProductReview | null> {
    const query = `
      SELECT *
      FROM product_reviews
      WHERE product_id = $1 AND student_id = $2 AND parent_id IS NULL
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [productId, studentId]);
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
  ): Promise<ProductReview> {
    const { title, comment } = updates;

    // Verify ownership
    const ownerResult = await pool.query(
      'SELECT student_id FROM product_reviews WHERE id = $1',
      [reviewId]
    );

    if (ownerResult.rows.length === 0) {
      throw new Error('Review not found');
    }

    if (ownerResult.rows[0].student_id !== studentId) {
      throw new Error('You can only update your own reviews');
    }

    let updateQuery = 'UPDATE product_reviews SET updated_at = CURRENT_TIMESTAMP';
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
      'SELECT student_id, product_id, parent_id FROM product_reviews WHERE id = $1',
      [reviewId]
    );

    if (ownerResult.rows.length === 0) {
      throw new Error('Review not found');
    }

    const { student_id: owner, product_id, parent_id } = ownerResult.rows[0];

    if (owner !== studentId) {
      throw new Error('You can only delete your own reviews');
    }

    try {
      // Count descendants (all comments that will be deleted)
      const descendantCount = await ReviewModel.countDescendants(reviewId);

      // Delete the review (CASCADE will handle all nested replies)
      await pool.query('DELETE FROM product_reviews WHERE id = $1', [reviewId]);

      // Update product rating if this was a top-level review
      if (!parent_id) {
        await ReviewModel.updateProductRating(product_id);
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
        SELECT id FROM product_reviews WHERE parent_id = $1
        UNION ALL
        SELECT pr.id FROM product_reviews pr
        INNER JOIN descendants d ON pr.parent_id = d.id
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
  static async getReviewById(reviewId: number): Promise<ReviewWithStudent | null> {
    const query = `
      SELECT
        pr.id,
        pr.product_id,
        pr.student_id,
        pr.rating,
        pr.title,
        pr.comment,
        pr.is_verified,
        pr.created_at,
        pr.updated_at,
        pr.parent_id,
        pr.depth,
        pr.thread_root_id,
        CONCAT(s.first_name, ' ', s.last_name) as student_name,
        s.profile_picture as student_avatar
      FROM product_reviews pr
      JOIN students s ON pr.student_id = s.student_id
      WHERE pr.id = $1
    `;

    try {
      const result = await pool.query(query, [reviewId]);
      if (result.rows.length === 0) {
        return null;
      }

      const review = result.rows[0];

      // Get all replies recursively
      if (review.parent_id === null) {
        const allReplies = await ReviewModel.getReviewReplies(reviewId);
        review.replies = ReviewModel.buildCommentThread(reviewId, allReplies);
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
        SELECT id, parent_id, 0 as depth FROM product_reviews WHERE id = $1
        UNION ALL
        SELECT pr.id, pr.parent_id, path.depth + 1
        FROM product_reviews pr
        INNER JOIN path ON pr.id = path.parent_id
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
      const depth = await ReviewModel.getCommentDepth(reviewId);
      return depth < MAX_COMMENT_DEPTH;
    } catch (error) {
      console.error('Error checking reply permission:', error);
      return false;
    }
  }
}
