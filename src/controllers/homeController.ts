import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

export const getHomeData = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Fetch featured products
    const productsResult = await pool.query(
      `SELECT p.*, s.first_name, s.last_name
       FROM products p
       JOIN students s ON p.student_id = s.student_id
       WHERE p.status = 'available'
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    // Fetch announcements
    const announcementsResult = await pool.query(
      'SELECT id, title, content, created_by, created_at, image_url FROM announcements ORDER BY created_at DESC LIMIT 5'
    );

    // Fetch categories
    const categoriesResult = await pool.query(
      'SELECT id, name, description, icon FROM categories ORDER BY name ASC'
    );

    // Fetch user's unread notification count
    const notificationsResult = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [studentId]
    );

    res.json({
      success: true,
      data: {
        featured_products: productsResult.rows,
        announcements: announcementsResult.rows,
        categories: categoriesResult.rows,
        unread_notifications: parseInt(notificationsResult.rows[0].unread_count),
      }
    });
  } catch (err: any) {
    console.error('❌ Get Home Data Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch home data',
      context: 'home/getHomeData',
    });
  }
};
