import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import { FollowModel } from '../models/followModel.js';

export class FollowController {
  // Follow a user
  static async followUser(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user?.student_id;
      const { following_id } = req.body;

      if (!followerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (followerId === following_id) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      const follow = await FollowModel.followUser({
        follower_id: followerId,
        following_id
      });

      res.status(201).json({ follow });
    } catch (error) {
      console.error('Error following user:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Unfollow a user
  static async unfollowUser(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user?.student_id;
      const { following_id } = req.body;

      if (!followerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (followerId === following_id) {
        return res.status(400).json({ error: 'Cannot unfollow yourself' });
      }

      const success = await FollowModel.unfollowUser(followerId, following_id);

      if (!success) {
        return res.status(404).json({ error: 'Follow relationship not found' });
      }

      res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Check if following a user
  static async isFollowing(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user?.student_id;
      const followingId = req.params.userId;

      if (!followerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const isFollowing = await FollowModel.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get followers of a user
  static async getFollowers(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await FollowModel.getFollowers(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching followers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get users that a user is following
  static async getFollowing(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await FollowModel.getFollowing(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching following:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get follow stats for a user (with current user context if authenticated)
  static async getFollowStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const currentUserId = req.user?.student_id;

      const stats = await FollowModel.getFollowStats(userId, currentUserId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching follow stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get mutual follows
  static async getMutualFollows(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.student_id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await FollowModel.getMutualFollows(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching mutual follows:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get most followed students leaderboard
  static async getMostFollowedLeaderboard(req: AuthRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const period = req.query.period as string || 'all'; // 'week', 'month', 'all'

      let dateFilter = '';
      if (period === 'week') {
        dateFilter = 'AND f.created_at >= NOW() - INTERVAL \'7 days\'';
      } else if (period === 'month') {
        dateFilter = 'AND f.created_at >= NOW() - INTERVAL \'30 days\'';
      }

      const query = `
        SELECT
          s.student_id,
          CONCAT(s.first_name, ' ', s.last_name) as name,
          s.profile_picture as avatar,
          COUNT(f.follower_id) as follower_count
        FROM students s
        JOIN follows f ON s.student_id = f.following_id
        WHERE 1=1 ${dateFilter}
        GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture
        ORDER BY COUNT(f.follower_id) DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      res.json({ leaderboard: result.rows });
    } catch (error) {
      console.error('Error fetching most followed leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get top sellers leaderboard
  static async getTopSellersLeaderboard(req: AuthRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const period = req.query.period as string || 'all'; // 'week', 'month', 'all'

      let dateFilter = '';
      if (period === 'week') {
        dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'7 days\'';
      } else if (period === 'month') {
        dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'30 days\'';
      }

      const query = `
        SELECT
          s.student_id,
          CONCAT(s.first_name, ' ', s.last_name) as name,
          s.profile_picture as avatar,
          COUNT(o.id) as score,
          ROW_NUMBER() OVER (ORDER BY COUNT(o.id) DESC) as rank
        FROM students s
        JOIN orders o ON s.student_id = o.seller_id
        WHERE o.status = 'completed' ${dateFilter}
        GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture
        ORDER BY COUNT(o.id) DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      res.json({ leaderboard: result.rows });
    } catch (error) {
      console.error('Error fetching top sellers leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get highest rated sellers leaderboard
  static async getHighestRatedLeaderboard(req: AuthRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const period = req.query.period as string || 'all'; // 'week', 'month', 'all'

      let dateFilter = '';
      if (period === 'week') {
        dateFilter = 'AND sr.created_at >= NOW() - INTERVAL \'7 days\'';
      } else if (period === 'month') {
        dateFilter = 'AND sr.created_at >= NOW() - INTERVAL \'30 days\'';
      }

      const query = `
        SELECT
          s.student_id,
          CONCAT(s.first_name, ' ', s.last_name) as name,
          s.profile_picture as avatar,
          ROUND(AVG(sr.rating), 1) as score,
          ROW_NUMBER() OVER (ORDER BY AVG(sr.rating) DESC) as rank
        FROM students s
        JOIN seller_reviews sr ON s.student_id = sr.seller_id
        WHERE 1=1 ${dateFilter}
        GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture
        HAVING COUNT(sr.id) >= 3
        ORDER BY AVG(sr.rating) DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      res.json({ leaderboard: result.rows });
    } catch (error) {
      console.error('Error fetching highest rated leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
