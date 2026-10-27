import { Request, Response } from 'express';
import {
  countUnreadMessages,
  getBookingMessages,
  getThreadMessages,
  getUserDmThreads,
  markMessagesRead,
  sendCompanionMessage,
  sendDirectMessage,
} from '../../services/companion/companionMessageService.js';
import { notificationService } from '../../services/notificationService.js';
import { handleControllerError } from '../../utils/apiError.js';
import { getStudentDisplayName } from '../../utils/studentName.js';

export function buildDirectThreadId(a: string, b: string): string {
  const [x, y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
}

export async function sendMessageController(req: Request, res: Response) {
  try {
    const sender_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!sender_id) return res.status(401).json({ error: 'Unauthorized' });

    let receiver_id = req.body.receiver_id;
    const booking_id = req.body.booking_id;
    const content = req.body.content;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Missing content' });
    }

    const { pool } = await import('../../db.js');

    let message;
    let threadId;

    // Check if booking_id is provided and what type it is
    if (booking_id && !String(booking_id).startsWith('dm:')) {
      // 1. Genuine booking message
      threadId = String(booking_id);

      // Look up booking participants
      const bookingRes = await pool.query(
        `SELECT b.id, b.freshman_id, b.guide_id, g.student_id AS guide_student_id
         FROM bookings b
         LEFT JOIN guides g ON b.guide_id = g.id
         WHERE b.id = $1`,
        [threadId]
      );

      if (bookingRes.rows.length > 0) {
        const b = bookingRes.rows[0];
        // If sender is the freshman, receiver is the guide
        if (sender_id === b.freshman_id) {
          receiver_id = b.guide_student_id;
        } else if (sender_id === b.guide_student_id) {
          // If sender is the guide, receiver is the freshman
          receiver_id = b.freshman_id;
        } else if (receiver_id === b.guide_id) {
          // If receiver_id matches guide UUID, map to guide_student_id
          receiver_id = b.guide_student_id;
        }
      }

      // If receiver_id was passed as a guide UUID, resolve it
      if (receiver_id) {
        const guideLookup = await pool.query('SELECT student_id FROM guides WHERE id::text = $1', [receiver_id]);
        if (guideLookup.rows.length > 0) {
          receiver_id = guideLookup.rows[0].student_id;
        }
      }

      if (!receiver_id) {
        return res.status(400).json({ error: 'Cannot determine recipient for this booking' });
      }

      message = await sendCompanionMessage({
        booking_id: threadId,
        sender_id,
        receiver_id,
        content: content.trim(),
        thread_type: 'booking',
      });
    } else {
      // 2. Direct message thread (either booking_id is dm:... or direct DM)
      const rawThreadId = booking_id && String(booking_id).startsWith('dm:') ? String(booking_id) : null;

      if (rawThreadId && (!receiver_id || receiver_id === sender_id)) {
        const parts = rawThreadId.replace(/^dm:/, '').split(':');
        receiver_id = parts.find((p) => p !== sender_id) || receiver_id;
      }

      // If receiver_id was passed as a guide UUID, resolve to their student_id
      if (receiver_id) {
        const guideLookup = await pool.query('SELECT student_id FROM guides WHERE id::text = $1', [receiver_id]);
        if (guideLookup.rows.length > 0) {
          receiver_id = guideLookup.rows[0].student_id;
        }
      }

      if (!receiver_id) {
        return res.status(400).json({ error: 'Missing receiver_id' });
      }

      // Verify recipient exists in students table
      const studentCheck = await pool.query('SELECT student_id FROM students WHERE student_id = $1', [receiver_id]);
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Recipient user not found' });
      }

      threadId = rawThreadId || buildDirectThreadId(sender_id, receiver_id);
      message = await sendDirectMessage({
        sender_id,
        receiver_id,
        content: content.trim(),
        thread_id: threadId,
      });
    }

    // Notify the receiver about the new message.
    try {
      await notificationService.createCompanionMessageNotification(
        receiver_id,
        await getStudentDisplayName(sender_id),
        threadId,
        content.trim()
      );
    } catch (notifyError) {
      console.error('[Companion] Failed to send message notification:', notifyError);
    }

    return res.status(201).json({ message, thread_id: threadId });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to send message',
      context: 'companion/sendMessage',
    });
  }
}

export async function getMessagesController(req: Request, res: Response) {
  try {
    const threadId = req.params.bookingId; // Can be a booking ID or a DM thread ID
    const messages = await getThreadMessages(threadId);
    return res.json({ messages });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get messages',
      context: 'companion/getMessages',
    });
  }
}

export async function getDmThreadsController(req: Request, res: Response) {
  try {
    const userId = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const threads = await getUserDmThreads(userId);
    return res.json({ threads });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get DM threads',
      context: 'companion/getDmThreads',
    });
  }
}

// GET /companion/messages/dm/inbox - Get DM and booking threads with user info for inbox display
export async function getDmInboxController(req: Request, res: Response) {
  try {
    const userId = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { pool } = await import('../../db.js');

    const result = await pool.query(
      `WITH thread_summary AS (
        SELECT 
          cm.booking_id AS thread_id,
          cm.thread_type,
          MAX(cm.created_at) AS last_message_time,
          COUNT(CASE WHEN cm.receiver_id = $1 AND cm.is_read = false THEN 1 END) AS unread_count,
          CASE 
            WHEN cm.thread_type = 'booking' THEN (
              SELECT CASE WHEN b.freshman_id = $1 THEN g.student_id ELSE b.freshman_id END
              FROM bookings b
              LEFT JOIN guides g ON b.guide_id = g.id
              WHERE b.id::text = cm.booking_id
              LIMIT 1
            )
            ELSE (
              SELECT CASE WHEN m2.sender_id = $1 THEN m2.receiver_id ELSE m2.sender_id END
              FROM companion_messages m2
              WHERE m2.booking_id = cm.booking_id AND (m2.sender_id = $1 OR m2.receiver_id = $1)
              ORDER BY m2.created_at DESC
              LIMIT 1
            )
          END AS other_user_id
        FROM companion_messages cm
        WHERE cm.sender_id = $1 OR cm.receiver_id = $1
        GROUP BY cm.booking_id, cm.thread_type
      )
      SELECT 
        ts.thread_id,
        COALESCE(ts.other_user_id, '') AS other_user_id,
        ts.last_message_time,
        ts.unread_count,
        s.first_name,
        s.last_name,
        s.profile_picture,
        s.hall_of_residence,
        s.program,
        cm.content AS last_message
      FROM thread_summary ts
      LEFT JOIN students s ON ts.other_user_id = s.student_id
      LEFT JOIN companion_messages cm ON cm.booking_id = ts.thread_id
        AND cm.created_at = ts.last_message_time
      ORDER BY ts.last_message_time DESC`,
      [userId]
    );

    const inbox = result.rows.map((row: any) => ({
      thread_id: row.thread_id,
      type: 'companion_dm',
      other_user_id: row.other_user_id || 'companion',
      last_message: row.last_message || '',
      last_message_time: row.last_message_time,
      unread_count: parseInt(row.unread_count) || 0,
      other_user_profile: {
        first_name: row.first_name || 'Companion',
        last_name: row.last_name || 'User',
        profile_picture: row.profile_picture || null,
        hall_of_residence: row.hall_of_residence || '',
        program: row.program || '',
      },
    }));

    return res.json({ inbox });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get DM inbox',
      context: 'companion/getDmInbox',
    });
  }
}

export async function markMessagesReadController(req: Request, res: Response) {
  try {
    const receiver_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!receiver_id) return res.status(401).json({ error: 'Unauthorized' });

    const bookingId = req.params.bookingId;
    await markMessagesRead({ booking_id: bookingId, receiver_id });

    const unreadCount = await countUnreadMessages({ booking_id: bookingId, receiver_id });
    return res.json({ success: true, unread_count: unreadCount });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to mark messages as read',
      context: 'companion/markMessagesRead',
    });
  }
}
