import { pool } from '../db.js';

export class FollowModel {
  // Follow a user
  static async followUser({ follower_id, following_id }: { follower_id: string; following_id: string }) {
    const query = `
      INSERT INTO follows (follower_id, following_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (follower_id, following_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [follower_id, following_id]);
    return result.rows[0];
  }

  // Unfollow a user
  static async unfollowUser(followerId: string, followingId: string) {
    const query = `
      DELETE FROM follows
      WHERE follower_id = $1 AND following_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [followerId, followingId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Check if following a user
  static async isFollowing(followerId: string, followingId: string) {
    const query = `
      SELECT 1 FROM follows
      WHERE follower_id = $1 AND following_id = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [followerId, followingId]);
    return result.rows.length > 0;
  }

  // Get followers of a user with pagination
  static async getFollowers(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) as total FROM follows WHERE following_id = $1`;
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      SELECT
        s.student_id,
        s.first_name,
        s.last_name,
        s.profile_picture,
        s.hall_of_residence,
        f.created_at
      FROM follows f
      JOIN students s ON f.follower_id = s.student_id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    const hasMore = offset + limit < total;
    
    return { 
      followers: result.rows,
      total,
      hasMore 
    };
  }

  // Get users that a user is following with pagination
  static async getFollowing(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) as total FROM follows WHERE follower_id = $1`;
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      SELECT
        s.student_id,
        s.first_name,
        s.last_name,
        s.profile_picture,
        s.hall_of_residence,
        f.created_at
      FROM follows f
      JOIN students s ON f.following_id = s.student_id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    const hasMore = offset + limit < total;
    
    return { 
      following: result.rows,
      total,
      hasMore 
    };
  }

  // Get follow stats for a user (includes current user context when provided)
  static async getFollowStats(userId: string, currentUserId?: string) {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count,
        CASE WHEN $2::text IS NOT NULL THEN EXISTS(
          SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1
        ) ELSE false END as is_following,
        CASE WHEN $2::text IS NOT NULL THEN EXISTS(
          SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
        ) ELSE false END as is_followed_by
    `;
    const result = await pool.query(query, [userId, currentUserId || null]);
    return result.rows[0];
  }

  // Get mutual follows
  static async getMutualFollows(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        s.student_id,
        CONCAT(s.first_name, ' ', s.last_name) as name,
        s.profile_picture as avatar
      FROM follows f1
      JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
      JOIN students s ON f1.following_id = s.student_id
      WHERE f1.follower_id = $1 AND f2.follower_id = f1.following_id
      ORDER BY f1.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return { mutualFollows: result.rows };
  }
}
