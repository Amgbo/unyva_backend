import { Request, Response } from 'express';
import { pool } from '../db.js';
import imagekit, { shouldUseImageKit } from '../config/imagekit.js';
import { getLocalUrl, deleteLocalFile } from '../config/multer.js';
import { handleControllerError } from '../utils/apiError.js';

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
      'SELECT id, title, content, created_by, created_at, image_url FROM announcements ORDER BY created_at DESC'
    );

    console.log('✅ Announcements fetched successfully');
    res.status(200).json({
      success: true,
      announcements: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Announcements Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch announcements',
      context: 'announcements/getAnnouncements',
    });
  }
};

// GET /api/announcements/:id - Fetch single announcement by ID
export const getAnnouncementById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('📢 Fetching announcement by ID:', id);

    const result = await pool.query(
      'SELECT id, title, content, created_by, created_at, image_url FROM announcements WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Announcement not found'
      });
      return;
    }

    console.log('✅ Announcement fetched successfully');
    res.status(200).json({
      success: true,
      announcement: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Announcement By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch announcement',
      context: 'announcements/getAnnouncementById',
    });
  }
};

// POST /api/announcements - Add new announcement (Admin only)
export const addAnnouncement = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('📢 Adding new announcement...');

    const { title, content } = req.body;
    const studentId = req.user?.student_id;
    let imageUrl: string | null = null;

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

    // Handle image upload if provided
    if (req.file) {
      console.log('📸 Processing image upload...');

      // Validate image file (reuse logic from imageController)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

      if (req.file.size > MAX_FILE_SIZE) {
        res.status(400).json({
          error: 'File size too large. Maximum size is 5MB.'
        });
        return;
      }

      if (shouldUseImageKit() && imagekit) {
        // Upload to ImageKit
        const result = await imagekit.upload({
          file: req.file.buffer,
          fileName: `announcement-${Date.now()}-${req.file.originalname}`,
          folder: "/unyva_announcements",
        });
        imageUrl = result.url;
        console.log('✅ Image uploaded to ImageKit:', imageUrl);
      } else {
        // Saved locally by multer
        const filename = (req.file.filename as string) || req.file.originalname;
        imageUrl = getLocalUrl('announcements', filename);
        console.log('✅ Image saved locally:', imageUrl);
      }
    }

    // Insert into database
    const result = await pool.query(
      'INSERT INTO announcements (title, content, created_by, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, studentId, imageUrl]
    );

    console.log('✅ Announcement added successfully');
    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      announcement: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add Announcement Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add announcement',
      context: 'announcements/addAnnouncement',
    });
  }
};

// DELETE /api/announcements/:id - Delete announcement (Admin only)
export const deleteAnnouncement = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    console.log('🗑️ Deleting announcement:', id);

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to delete announcement');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    console.log('✅ Admin access verified for student:', studentId);

    // Check if announcement exists
    const checkResult = await pool.query(
      'SELECT id, image_url FROM announcements WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: 'Announcement not found'
      });
      return;
    }

    const announcement = checkResult.rows[0];

    // Delete from database
    await pool.query('DELETE FROM announcements WHERE id = $1', [id]);

    // If there's an image_url, delete from ImageKit or local storage
    if (announcement.image_url) {
      try {
        if (shouldUseImageKit() && imagekit) {
          const parts = announcement.image_url.split('/');
          const fileId = parts[parts.length - 1];
          await imagekit.deleteFile(fileId);
          console.log('🗑️ Deleted announcement image from ImageKit:', fileId);
        } else {
          const parts = announcement.image_url.split('/');
          const filename = parts[parts.length - 1];
          await deleteLocalFile('announcements', filename);
          console.log('🗑️ Deleted local announcement image:', filename);
        }
      } catch (err: any) {
        console.error('⚠️ Failed to delete announcement image:', err?.message || err);
      }
    }

    console.log('✅ Announcement deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Announcement Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete announcement',
      context: 'announcements/deleteAnnouncement',
    });
  }
};
