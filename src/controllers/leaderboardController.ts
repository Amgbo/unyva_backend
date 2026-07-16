import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/leaderboard - Get top students leaderboard
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 20, type = 'overall' } = req.query;
    const limitNum = Math.min(Number(limit) || 20, 100);

    console.log('🏆 Fetching leaderboard...');

    let query = '';

    switch (type) {
      case 'sellers':
        query = `
          SELECT s.student_id, s.first_name, s.last_name, s.profile_picture,
                 COUNT(p.id) as products_count,
                 COALESCE(SUM(p.price), 0) as total_value
          FROM students s
          LEFT JOIN products p ON s.student_id = p.student_id AND p.status = 'sold'
          GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture
          ORDER BY products_count DESC, total_value DESC
          LIMIT $1
        `;
        break;
      case 'buyers':
        query = `
          SELECT s.student_id, s.first_name, s.last_name, s.profile_picture,
                 COUNT(o.id) as orders_count,
                 COALESCE(SUM(o.total_amount), 0) as total_spent
          FROM students s
          LEFT JOIN orders o ON s.student_id = o.student_id
          GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture
          ORDER BY orders_count DESC, total_spent DESC
          LIMIT $1
        `;
        break;
      default:
        query = `
          SELECT s.student_id, s.first_name, s.last_name, s.profile_picture,
                 COUNT(DISTINCT p.id) as products_count,
                 COUNT(DISTINCT o.id) as orders_count,
                 COALESCE(SUM(DISTINCT o.total_amount), 0) as total_value
          FROM students s
          LEFT JOIN products p ON s.student_id = p.student_id AND p.status = 'sold'
          LEFT JOIN orders o ON s.student_id = o.student_id
          GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture
          ORDER BY products_count DESC, orders_count DESC
          LIMIT $1
        `;
    }

    const result = await pool.query(query, [limitNum]);

    console.log('✅ Leaderboard fetched successfully');
    res.status(200).json({
      success: true,
      leaderboard: result.rows,
      type
    });
  } catch (err: any) {
    console.error('❌ Get Leaderboard Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch leaderboard',
      context: 'leaderboard/getLeaderboard',
    });
  }
};

// GET /api/leaderboard/student/:studentId - Get student ranking
export const getStudentRanking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    console.log('🏆 Fetching student ranking:', studentId);

    // Get student's stats
    const statsResult = await pool.query(
      `SELECT 
        s.student_id, s.first_name, s.last_name, s.profile_picture,
        COUNT(DISTINCT p.id) as products_sold,
        COUNT(DISTINCT o.id) as orders_count,
        COALESCE(SUM(DISTINCT o.total_amount), 0) as total_spent
      FROM students s
      LEFT JOIN products p ON s.student_id = p.student_id AND p.status = 'sold'
      LEFT JOIN orders o ON s.student_id = o.student_id
      WHERE s.student_id = $1
      GROUP BY s.student_id, s.first_name, s.last_name, s.profile_picture`,
      [studentId]
    );

    if (statsResult.rows.length === 0) {
      res.status(404).json({
        error: 'Student not found'
      });
      return;
    }

    // Get overall rank
    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM (
         SELECT s.student_id,
                COUNT(p.id) as products_count
         FROM students s
         LEFT JOIN products p ON s.student_id = p.student_id AND p.status = 'sold'
         GROUP BY s.student_id
         HAVING COUNT(p.id) > $1
       ) ranked`,
      [statsResult.rows[0].products_sold]
    );

    res.status(200).json({
      success: true,
      ranking: {
        ...statsResult.rows[0],
        rank: parseInt(rankResult.rows[0].rank)
      }
    });
  } catch (err: any) {
    console.error('❌ Get Student Ranking Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch student ranking',
      context: 'leaderboard/getStudentRanking',
    });
  }
};
