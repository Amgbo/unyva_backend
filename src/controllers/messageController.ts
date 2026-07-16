import { Request, Response } from 'express';
import { pool } from '../db.js';
import { notificationService } from '../services/notificationService.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/messages/conversations - Get user's conversations
export const getConversations = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `WITH conversations AS (
        SELECT 
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
          MAX(created_at) as last_message_at,
          COUNT(CASE WHEN receiver_id = $1 AND is_read = false THEN 1 END) as unread_count
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
        GROUP BY other_user_id
      )
      SELECT c.*, s.first_name, s.last_name, s.profile_picture,
             m.content as last_message_content
      FROM conversations c
      JOIN students s ON c.other_user_id = s.student_id
      LEFT JOIN messages m ON m.created_at = c.last_message_at
        AND (m.sender_id = c.other_user_id OR m.receiver_id = c.other_user_id)
      ORDER BY c.last_message_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Conversations Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch conversations',
      context: 'message/getConversations',
    });
  }
};

// GET /api/messages/:otherUserId - Get messages between two users
export const getMessages = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { otherUserId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT m.*, 
              s.first_name as sender_first_name, s.last_name as sender_last_name
       FROM messages m
       JOIN students s ON m.sender_id = s.student_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [studentId, otherUserId, Number(limit), Number(offset)]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE messages SET is_read = true
       WHERE sender_id = $2 AND receiver_id = $1 AND is_read = false`,
      [studentId, otherUserId]
    );

    res.json({
      success: true,
      messages: result.rows.reverse()
    });
  } catch (err: any) {
    console.error('❌ Get Messages Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch messages',
      context: 'message/getMessages',
    });
  }
};

// POST /api/messages/:otherUserId - Send a message
export const sendMessage = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { otherUserId } = req.params;
    const { content } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    if (otherUserId === studentId) {
      res.status(400).json({ error: 'Cannot send message to yourself' });
      return;
    }

    // Check if receiver exists
    const receiverResult = await pool.query(
      'SELECT student_id FROM students WHERE student_id = $1',
      [otherUserId]
    );

    if (receiverResult.rows.length === 0) {
      res.status(404).json({ error: 'Receiver not found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [studentId, otherUserId, content.trim()]
    );

    // Send notification to receiver
    try {
      await notificationService.createAndSend({
        user_id: otherUserId,
        type: 'message',
        title: 'New Message',
        message: content.trim(),
        data: { sender_id: studentId },
        priority: 'medium',
        delivery_methods: ['push'],
      });
    } catch (notifyError) {
      console.warn('Failed to send message notification:', notifyError);
    }

    res.status(201).json({
      success: true,
      message: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Send Message Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to send message',
      context: 'message/sendMessage',
    });
  }
};

// GET /api/messages/unread-count - Get unread message count
export const getUnreadCount = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false',
      [studentId]
    );

    res.json({
      success: true,
      unread_count: parseInt(result.rows[0].count)
    });
  } catch (err: any) {
    console.error('❌ Get Unread Count Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch unread count',
      context: 'message/getUnreadCount',
    });
  }
};

// DELETE /api/messages/:messageId - Delete a message
export const deleteMessage = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { messageId } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING *',
      [messageId, studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Message not found or not authorized to delete' });
      return;
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Message Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete message',
      context: 'message/deleteMessage',
    });
  }
};
