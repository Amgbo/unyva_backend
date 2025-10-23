import { Request, Response } from 'express';
import { pool } from '../db.js';

// Dummy announcements data for initial testing
const dummyAnnouncements = [
  {
    id: 1,
    title: 'Welcome to Unyva Campus Platform',
    content: 'We are excited to launch our new campus platform where students can buy, sell, and connect with each other. Stay tuned for more updates!',
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'Library Hours Extended',
    content: 'The university library will now be open until 10 PM on weekdays starting next week. This is to accommodate students with evening classes.',
    created_at: '2024-01-20T14:30:00Z'
  },
  {
    id: 3,
    title: 'Campus WiFi Upgrade',
    content: 'Campus WiFi will be upgraded this weekend. Expect some intermittent connectivity issues from 12 AM to 6 AM on Saturday.',
    created_at: '2024-01-25T09:15:00Z'
  }
];

// GET /api/announcements - Fetch all announcements
export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📢 Fetching announcements...');

    const result = await pool.query(
      'SELECT id, title, content, created_by, created_at FROM announcements ORDER BY created_at DESC'
    );

    console.log('✅ Announcements fetched successfully');
    res.status(200).json({
      success: true,
      announcements: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Announcements Error:', err);
    res.status(500).json({
      error: 'Failed to fetch announcements',
      message: err.message
    });
  }
};

// POST /api/announcements - Add new announcement (Admin only)
export const addAnnouncement = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('📢 Adding new announcement...');

    const { title, content } = req.body;
    const studentId = req.user?.student_id;

    // Validate required fields
    if (!title || !content) {
      res.status(400).json({
        error: 'Title and content are required'
      });
      return;
    }

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to post announcement');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    console.log('✅ Admin access verified for student:', studentId);

    // Insert into database
    const result = await pool.query(
      'INSERT INTO announcements (title, content, created_by) VALUES ($1, $2, $3) RETURNING *',
      [title, content, studentId]
    );

    console.log('✅ Announcement added successfully');
    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      announcement: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add Announcement Error:', err);
    res.status(500).json({
      error: 'Failed to add announcement',
      message: err.message
    });
  }
};
