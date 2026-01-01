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

  // Get followers of a user
  static async getFollowers(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        s.student_id,
        CONCAT(s.first_name, ' ', s.last_name) as name,
        s.profile_picture as avatar,
        f.created_at
      FROM follows f
      JOIN students s ON f.follower_id = s.student_id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return { followers: result.rows };
  }

  // Get users that a user is following
  static async getFollowing(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        s.student_id,
        CONCAT(s.first_name, ' ', s.last_name) as name,
        s.profile_picture as avatar,
        f.created_at
      FROM follows f
      JOIN students s ON f.following_id = s.student_id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return { following: result.rows };
  }

  // Get follow stats for a user
  static async getFollowStats(userId: string) {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count
    `;
    const result = await pool.query(query, [userId]);
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
