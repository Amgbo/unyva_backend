import { pool } from '../db.js';

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

export class ReviewModel {
  // Create product reviews table if it doesn't exist
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        parent_id INTEGER REFERENCES product_reviews(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_student_id ON product_reviews(student_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_id ON product_reviews(parent_id);
    `;

    try {
      await pool.query(query);
    } catch (error) {
      console.error('Error creating product_reviews table:', error);
      throw error;
    }
  }

  // Get all reviews for a product with nested replies (recursive)
  static async getProductReviews(
    productId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: ReviewWithStudent[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    // First, get top-level reviews with pagination
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

    // Get all nested replies for the product
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

      // Build nested structure recursively
      const reviewsWithNestedReplies = topLevelReviews.map(review => ({
        ...review,
        replies: ReviewModel.buildNestedComments(review.id, allReplies)
      }));

      return { reviews: reviewsWithNestedReplies, total, hasMore };
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  // Helper function to recursively build nested comment structure
  private static buildNestedComments(parentId: number, allComments: ReviewWithStudent[]): ReviewWithStudent[] | undefined {
    const children = allComments.filter(c => c.parent_id === parentId);
    
    if (children.length === 0) {
      return undefined;
    }

    return children.map(child => ({
      ...child,
      replies: ReviewModel.buildNestedComments(child.id, allComments)
    }));
  }

  // Create a new review
  static async createReview(reviewData: CreateReviewData): Promise<ProductReview> {
    const { product_id, student_id, rating, title, comment, order_id, parent_id } = reviewData;

    // Check if user is trying to review their own product (only for top-level reviews)
    if (!parent_id) {
      const productOwner = await pool.query(
        'SELECT student_id FROM products WHERE id = $1',
        [product_id]
      );

      if (productOwner.rows.length === 0) {
        throw new Error('Product not found');
      }

      if (productOwner.rows[0].student_id === student_id) {
        throw new Error('You cannot review your own product');
      }
    }

    // Determine if this is a verified purchase (only for top-level reviews)
    let isVerifiedPurchase = false;
    if (!parent_id && order_id) {
      const orderCheck = await pool.query(
        'SELECT id FROM orders WHERE id = $1 AND customer_id = $2 AND product_id = $3 AND status = $4',
        [order_id, student_id, product_id, 'delivered']
      );
      isVerifiedPurchase = orderCheck.rows.length > 0;
    }

    const query = `
      INSERT INTO product_reviews (product_id, student_id, rating, title, comment, is_verified, order_id, parent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        product_id,
        student_id,
        rating,
        title,
        comment,
        isVerifiedPurchase,
        order_id || null,
        parent_id || null
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Update product rating and review count
  static async updateProductRating(productId: number): Promise<void> {
    const query = `
      UPDATE products
      SET
        rating = (
          SELECT AVG(rating)::DECIMAL(3,2)
          FROM product_reviews
          WHERE product_id = $1
        ),
        review_count = (
          SELECT COUNT(*)
          FROM product_reviews
          WHERE product_id = $1
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

  // Check if user can review a product (everyone except the seller can review and if not already reviewed)
  static async canUserReviewProduct(studentId: string, productId: number): Promise<boolean> {
    // Check if user is the seller of this product or has already reviewed
    const sellerQuery = `
      SELECT student_id
      FROM products
      WHERE id = $1
    `;

    const reviewCheckQuery = `
      SELECT id
      FROM product_reviews
      WHERE product_id = $1 AND student_id = $2 AND parent_id IS NULL
    `;

    try {
      const [productResult, reviewResult] = await Promise.all([
        pool.query(sellerQuery, [productId]),
        pool.query(reviewCheckQuery, [productId, studentId])
      ]);

      if (productResult.rows.length === 0) {
        return false; // Product not found
      }
      const sellerId = productResult.rows[0].student_id;

      if (sellerId === studentId) {
        return false; // Seller cannot review own product
      }

      if (reviewResult.rows.length > 0) {
        return false; // User already reviewed this product
      }

      return true; // Can review
    } catch (error) {
      console.error('Error checking if user can review product:', error);
      return false;
    }
  }

  // Check if a comment can have replies (depth < 2, meaning max 3 levels)
  static async canReplyToComment(commentId: number): Promise<boolean> {
    const query = `
      SELECT depth FROM product_reviews WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [commentId]);
      if (result.rows.length === 0) {
        return false; // Comment doesn't exist
      }
      const depth = result.rows[0].depth || 0;
      return depth < 2; // Can reply if depth is 0 or 1 (allows max 3 levels)
    } catch (error) {
      console.error('Error checking reply eligibility:', error);
      return false;
    }
  }

  // Get user's review for a specific product
  static async getUserReviewForProduct(studentId: string, productId: number): Promise<ProductReview | null> {
    const query = `
      SELECT * FROM product_reviews
      WHERE student_id = $1 AND product_id = $2
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [studentId, productId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching user review:', error);
      throw error;
    }
  }

  // Delete a review and its replies
  static async deleteReview(reviewId: number): Promise<void> {
    // First get the product_id for rating update
    const getProductQuery = `
      SELECT product_id FROM product_reviews
      WHERE id = $1
    `;

    try {
      const productResult = await pool.query(getProductQuery, [reviewId]);

      if (productResult.rows.length === 0) {
        throw new Error('Review not found');
      }

      const productId = productResult.rows[0].product_id;

      // Delete the review (CASCADE will handle replies)
      const deleteQuery = `
        DELETE FROM product_reviews
        WHERE id = $1
      `;

      await pool.query(deleteQuery, [reviewId]);

      // Update product rating after deletion
      await ReviewModel.updateProductRating(productId);
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }
}
