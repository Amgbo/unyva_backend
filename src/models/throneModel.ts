import { pool } from '../db.js';

export interface Throne {
  id: number;
  user_id: string;
  throne_type: 'top_seller' | 'most_trusted_seller' | 'most_followed_student' | 'most_active_student';
  week_start: Date;
  week_end: Date;
  score: number;
  created_at: Date;
}

export interface ThroneWinner {
  throne_type: string;
  user_id: string;
  score: number;
  user_name?: string;
  user_avatar?: string;
}

export interface UserThroneHistory {
  throne: Throne;
  week_label: string;
}

export class ThroneModel {
  // Calculate and save thrones for a specific week
  static async calculateWeeklyThrones(weekStart: Date): Promise<Throne[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    try {
      // Get throne winners using the database function
      const winnersQuery = `
        SELECT throne_type, user_id, score
        FROM calculate_weekly_thrones($1::DATE)
      `;
      const winnersResult = await pool.query(winnersQuery, [weekStart]);

      const thrones: Throne[] = [];

      // Insert each throne winner
      for (const winner of winnersResult.rows) {
        const insertQuery = `
          INSERT INTO thrones (user_id, throne_type, week_start, week_end, score)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, throne_type, week_start) DO NOTHING
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
          winner.user_id,
          winner.throne_type,
          weekStart,
          weekEnd,
          winner.score
        ]);

        if (result.rows.length > 0) {
          thrones.push(result.rows[0]);
        }
      }

      return thrones;
    } catch (error) {
      console.error('Error calculating weekly thrones:', error);
      throw error;
    }
  }

  // Get current throne holders (most recent week)
  static async getCurrentThroneHolders(): Promise<ThroneWinner[]> {
    const query = `
      SELECT
        t.*,
        CONCAT(s.first_name, ' ', s.last_name) as user_name,
        s.profile_picture as user_avatar
      FROM thrones t
      JOIN students s ON t.user_id = s.student_id
      WHERE (t.throne_type, t.week_start) IN (
        SELECT throne_type, MAX(week_start)
        FROM thrones
        GROUP BY throne_type
      )
      ORDER BY t.throne_type
    `;

    try {
      const result = await pool.query(query);
      return result.rows.map(row => ({
        throne_type: row.throne_type,
        user_id: row.user_id,
        score: parseFloat(row.score),
        user_name: row.user_name,
        user_avatar: row.user_avatar
      }));
    } catch (error) {
      console.error('Error fetching current throne holders:', error);
      throw error;
    }
  }

  // Get throne holders for a specific week
  static async getThroneHoldersForWeek(weekStart: Date): Promise<ThroneWinner[]> {
    const query = `
      SELECT
        t.*,
        CONCAT(s.first_name, ' ', s.last_name) as user_name,
        s.profile_picture as user_avatar
      FROM thrones t
      JOIN students s ON t.user_id = s.student_id
      WHERE t.week_start = $1
      ORDER BY t.throne_type
    `;

    try {
      const result = await pool.query(query, [weekStart]);
      return result.rows.map(row => ({
        throne_type: row.throne_type,
        user_id: row.user_id,
        score: parseFloat(row.score),
        user_name: row.user_name,
        user_avatar: row.user_avatar
      }));
    } catch (error) {
      console.error('Error fetching throne holders for week:', error);
      throw error;
    }
  }

  // Get user's throne history
  static async getUserThroneHistory(userId: string, limit: number = 10): Promise<UserThroneHistory[]> {
    const query = `
      SELECT
        *,
        TO_CHAR(week_start, 'Mon DD, YYYY') as week_label
      FROM thrones
      WHERE user_id = $1
      ORDER BY week_start DESC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows.map(row => ({
        throne: {
          id: row.id,
          user_id: row.user_id,
          throne_type: row.throne_type,
          week_start: row.week_start,
          week_end: row.week_end,
          score: parseFloat(row.score),
          created_at: row.created_at
        },
        week_label: row.week_label
      }));
    } catch (error) {
      console.error('Error fetching user throne history:', error);
      throw error;
    }
  }

  // Get throne statistics
  static async getThroneStats(throneType?: string): Promise<{
    totalThrones: number;
    uniqueWinners: number;
    averageScore: number;
  }> {
    let whereClause = '';
    let params: any[] = [];

    if (throneType) {
      whereClause = 'WHERE throne_type = $1';
      params = [throneType];
    }

    const query = `
      SELECT
        COUNT(*) as total_thrones,
        COUNT(DISTINCT user_id) as unique_winners,
        AVG(score)::DECIMAL(10,2) as average_score
      FROM thrones
      ${whereClause}
    `;

    try {
      const result = await pool.query(query, params);
      const row = result.rows[0];

      return {
        totalThrones: parseInt(row.total_thrones),
        uniqueWinners: parseInt(row.unique_winners),
        averageScore: parseFloat(row.average_score) || 0
      };
    } catch (error) {
      console.error('Error fetching throne stats:', error);
      throw error;
    }
  }

  // Check if thrones have been calculated for a specific week
  static async areThronesCalculatedForWeek(weekStart: Date): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM thrones WHERE week_start = $1';
    const result = await pool.query(query, [weekStart]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get throne types
  static getThroneTypes(): { type: string; name: string; description: string }[] {
    return [
      {
        type: 'top_seller',
        name: 'Top Seller',
        description: 'Most completed deals this week'
      },
      {
        type: 'most_trusted_seller',
        name: 'Most Trusted Seller',
        description: 'Highest average rating (min 3 reviews)'
      },
      {
        type: 'most_followed_student',
        name: 'Most Followed Student',
        description: 'Most new followers this week'
      },
      {
        type: 'most_active_student',
        name: 'Most Active Student',
        description: 'Most active in listing and messaging'
      }
    ];
  }
}
