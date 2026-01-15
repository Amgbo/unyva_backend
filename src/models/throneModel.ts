import { pool } from '../db.js';

export interface Throne {
  id: number;
  student_id: string;
  throne_type_id: number;
  throne_type?: string;
  week_start: Date;
  week_end?: Date;
  points_earned: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ThroneType {
  id: number;
  name: string;
  description: string;
  points_required: number;
  is_active: boolean;
}

export interface ThroneWinner {
  throne_type: string;
  user: {
    student_id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  score: number;
  week_start: string;
  week_end: string;
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
      const thrones: Throne[] = [];

      // Calculate each throne type
      const topSellerThrones = await this.calculateTopSellerThrone(weekStart);
      const trustedSellerThrones = await this.calculateMostTrustedSellerThrone(weekStart);
      const followedStudentThrones = await this.calculateMostFollowedStudentThrone(weekStart);
      const activeStudentThrones = await this.calculateMostActiveStudentThrone(weekStart);

      // Combine all throne results
      thrones.push(...topSellerThrones, ...trustedSellerThrones, ...followedStudentThrones, ...activeStudentThrones);

      return thrones;
    } catch (error) {
      console.error('Error calculating weekly thrones:', error);
      throw error;
    }
  }

  // Calculate Top Seller Throne (orders + deliveries + meetups)
  static async calculateTopSellerThrone(weekStart: Date): Promise<Throne[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const query = `
      SELECT
        seller_id as student_id,
        COUNT(*) as points_earned
      FROM (
        -- Completed orders
        SELECT seller_id, created_at FROM orders
        WHERE status = 'delivered'
        AND created_at >= $1 AND created_at <= $2

        UNION ALL

        -- Completed deliveries
        SELECT seller_id, created_at FROM deliveries
        WHERE status = 'completed'
        AND created_at >= $1 AND created_at <= $2

        -- TODO: Add meetups when meetup tracking is implemented
      ) transactions
      GROUP BY seller_id
      HAVING COUNT(*) >= 1
      ORDER BY points_earned DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [weekStart, weekEnd]);

      if (result.rows.length === 0) return [];

      const winner = result.rows[0];
      const throneTypeId = await this.getThroneTypeId('top_seller');

      const insertQuery = `
        INSERT INTO thrones (student_id, throne_type_id, week_start, points_earned)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id, throne_type_id, week_start) DO NOTHING
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        winner.student_id,
        throneTypeId,
        weekStart,
        winner.points_earned
      ]);

      return insertResult.rows;
    } catch (error) {
      console.error('Error calculating top seller throne:', error);
      throw error;
    }
  }

  // Calculate Most Trusted Seller Throne
  static async calculateMostTrustedSellerThrone(weekStart: Date): Promise<Throne[]> {
    const query = `
      SELECT
        seller_id as student_id,
        AVG(rating) as avg_rating,
        COUNT(*) as review_count
      FROM (
        SELECT
          p.student_id as seller_id,
          pr.rating,
          pr.created_at
        FROM product_reviews pr
        JOIN products p ON pr.product_id = p.id

        UNION ALL

        SELECT
          sb.provider_id as seller_id,
          sr.rating,
          sr.created_at
        FROM service_reviews sr
        JOIN service_bookings sb ON sr.booking_id = sb.id
      ) reviews
      GROUP BY seller_id
      HAVING COUNT(*) >= 3
      ORDER BY avg_rating DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, []);

      if (result.rows.length === 0) return [];

      const winner = result.rows[0];
      const throneTypeId = await this.getThroneTypeId('most_trusted_seller');

      const insertQuery = `
        INSERT INTO thrones (student_id, throne_type_id, week_start, points_earned)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id, throne_type_id, week_start) DO NOTHING
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        winner.student_id,
        throneTypeId,
        weekStart,
        Math.round(winner.avg_rating * 100) // Store as integer (e.g., 475 for 4.75)
      ]);

      return insertResult.rows;
    } catch (error) {
      console.error('Error calculating most trusted seller throne:', error);
      throw error;
    }
  }

  // Calculate Most Followed Student Throne
  static async calculateMostFollowedStudentThrone(weekStart: Date): Promise<Throne[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const query = `
      SELECT
        following_id as student_id,
        COUNT(*) as points_earned
      FROM follows
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY following_id
      HAVING COUNT(*) >= 1
      ORDER BY points_earned DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [weekStart, weekEnd]);

      if (result.rows.length === 0) return [];

      const winner = result.rows[0];
      const throneTypeId = await this.getThroneTypeId('most_followed_student');

      const insertQuery = `
        INSERT INTO thrones (student_id, throne_type_id, week_start, points_earned)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id, throne_type_id, week_start) DO NOTHING
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        winner.student_id,
        throneTypeId,
        weekStart,
        winner.points_earned
      ]);

      return insertResult.rows;
    } catch (error) {
      console.error('Error calculating most followed student throne:', error);
      throw error;
    }
  }

  // Calculate Most Active Student Throne
  static async calculateMostActiveStudentThrone(weekStart: Date): Promise<Throne[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const query = `
      WITH activity_scores AS (
        -- Product views (weight: 0.3)
        SELECT
          pv.student_id,
          COUNT(*) * 0.3 as view_score
        FROM product_views pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.viewed_at >= $1 AND pv.viewed_at <= $2
        GROUP BY pv.student_id

        UNION ALL

        -- Service bookings received (weight: 0.3)
        SELECT
          sb.provider_id as student_id,
          COUNT(*) * 0.3 as booking_score
        FROM service_bookings sb
        WHERE sb.created_at >= $1 AND sb.created_at <= $2
        GROUP BY sb.provider_id

        UNION ALL

        -- Orders placed as buyer (weight: 0.2)
        SELECT
          o.customer_id as student_id,
          COUNT(*) * 0.2 as order_score
        FROM orders o
        WHERE o.created_at >= $1 AND o.created_at <= $2
        GROUP BY o.customer_id

        UNION ALL

        -- Reviews written (weight: 0.2)
        SELECT
          pr.student_id,
          COUNT(*) * 0.2 as review_score
        FROM product_reviews pr
        WHERE pr.created_at >= $1 AND pr.created_at <= $2
        GROUP BY pr.student_id

        UNION ALL

        SELECT
          sr.customer_id as student_id,
          COUNT(*) * 0.2 as review_score
        FROM service_reviews sr
        WHERE sr.created_at >= $1 AND sr.created_at <= $2
        GROUP BY sr.customer_id
      )
      SELECT
        student_id,
        SUM(COALESCE(view_score, 0) + COALESCE(booking_score, 0) + COALESCE(order_score, 0) + COALESCE(review_score, 0)) as total_score
      FROM activity_scores
      GROUP BY student_id
      HAVING SUM(COALESCE(view_score, 0) + COALESCE(booking_score, 0) + COALESCE(order_score, 0) + COALESCE(review_score, 0)) > 0
      ORDER BY total_score DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [weekStart, weekEnd]);

      if (result.rows.length === 0) return [];

      const winner = result.rows[0];
      const throneTypeId = await this.getThroneTypeId('most_active_student');

      const insertQuery = `
        INSERT INTO thrones (student_id, throne_type_id, week_start, points_earned)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (student_id, throne_type_id, week_start) DO NOTHING
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        winner.student_id,
        throneTypeId,
        weekStart,
        Math.round(winner.total_score)
      ]);

      return insertResult.rows;
    } catch (error) {
      console.error('Error calculating most active student throne:', error);
      throw error;
    }
  }

  // Helper function to get throne type ID
  static async getThroneTypeId(throneName: string): Promise<number> {
    const query = 'SELECT id FROM throne_types WHERE name = $1';
    const result = await pool.query(query, [throneName]);

    if (result.rows.length === 0) {
      throw new Error(`Throne type '${throneName}' not found`);
    }

    return result.rows[0].id;
  }

  // Get current throne holders (most recent week)
  static async getCurrentThroneHolders(): Promise<ThroneWinner[]> {
    const query = `
      SELECT
        tt.name as throne_type,
        t.points_earned as score,
        t.week_start,
        s.student_id,
        s.first_name,
        s.last_name,
        s.profile_picture
      FROM thrones t
      JOIN throne_types tt ON t.throne_type_id = tt.id
      JOIN students s ON t.student_id = s.student_id
      WHERE t.id IN (
        SELECT DISTINCT ON (throne_type_id) id
        FROM thrones
        ORDER BY throne_type_id, week_start DESC
      )
      ORDER BY t.throne_type_id
    `;

    try {
      const result = await pool.query(query);
      return result.rows.map(row => {
        const wkStart = row.week_start instanceof Date ? row.week_start : new Date(row.week_start);
        const weekEnd = new Date(wkStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        return {
          throne_type: row.throne_type,
          user: {
            student_id: row.student_id,
            first_name: row.first_name,
            last_name: row.last_name,
            profile_picture: row.profile_picture
          },
          score: row.score,
          week_start: wkStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0]
        };
      });
    } catch (error) {
      console.error('Error fetching current throne holders:', error);
      throw error;
    }
  }

  // Get throne holders for a specific week
  static async getThroneHoldersForWeek(weekStart: Date): Promise<ThroneWinner[]> {
    const query = `
      SELECT
        tt.name as throne_type,
        t.points_earned as score,
        t.week_start,
        t.week_end,
        s.student_id,
        s.first_name,
        s.last_name,
        s.profile_picture
      FROM thrones t
      JOIN throne_types tt ON t.throne_type_id = tt.id
      JOIN students s ON t.student_id = s.student_id
      WHERE t.week_start = $1
      ORDER BY t.throne_type_id
    `;

    try {
      const result = await pool.query(query, [weekStart]);
      return result.rows.map(row => {
        const wkStart = row.week_start instanceof Date ? row.week_start : new Date(row.week_start);
        const wkEnd = row.week_end ? (row.week_end instanceof Date ? row.week_end : new Date(row.week_end)) : null;

        return {
          throne_type: row.throne_type,
          user: {
            student_id: row.student_id,
            first_name: row.first_name,
            last_name: row.last_name,
            profile_picture: row.profile_picture
          },
          score: row.score,
          week_start: wkStart.toISOString().split('T')[0],
          week_end: wkEnd ? wkEnd.toISOString().split('T')[0] : null
        };
      });
    } catch (error) {
      console.error('Error fetching throne holders for week:', error);
      throw error;
    }
  }

  // Get user's throne history
  static async getUserThroneHistory(userId: string, limit: number = 10): Promise<UserThroneHistory[]> {
    const query = `
      SELECT
        t.*,
        tt.name as throne_type,
        TO_CHAR(t.week_start, 'Mon DD, YYYY') as week_label
      FROM thrones t
      JOIN throne_types tt ON t.throne_type_id = tt.id
      WHERE t.student_id = $1
      ORDER BY t.week_start DESC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows.map(row => ({
        throne: {
          id: row.id,
          student_id: row.student_id,
          throne_type_id: row.throne_type_id,
          throne_type: row.throne_type,
          week_start: row.week_start,
          week_end: row.week_end,
          points_earned: row.points_earned,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at
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
      whereClause = 'WHERE tt.name = $1';
      params = [throneType];
    }

    const query = `
      SELECT
        COUNT(*) as total_thrones,
        COUNT(DISTINCT t.student_id) as unique_winners,
        AVG(t.points_earned)::DECIMAL(10,2) as average_score
      FROM thrones t
      JOIN throne_types tt ON t.throne_type_id = tt.id
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
        description: 'Highest rated seller with minimum 3 reviews'
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
