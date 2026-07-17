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

export function buildDirectThreadId(a: string, b: string): string {
  const [x, y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
}

function formatStudentName(student: any): string {
  const full = [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim();
  return full || `@${student?.student_id}` || 'Someone';
}

export async function sendMessageController(req: Request, res: Response) {
  try {
    const sender_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!sender_id) return res.status(401).json({ error: 'Unauthorized' });

    const receiver_id = req.body.receiver_id;
    const booking_id = req.body.booking_id;
    const content = req.body.content;

    if (!receiver_id || !content) {
      return res.status(400).json({ error: 'Missing receiver_id/content' });
    }

    let message;
    let threadId;

    if (booking_id) {
      // Booking message
      threadId = booking_id;
      message = await sendCompanionMessage({
        booking_id: threadId,
        sender_id,
        receiver_id,
        content,
        thread_type: 'booking',
      });
    } else {
      // Direct message
      threadId = buildDirectThreadId(sender_id, receiver_id);
      message = await sendDirectMessage({
        sender_id,
        receiver_id,
        content,
        thread_id: threadId,
      });
    }

    // Notify the receiver about the new message.
    try {
      await notificationService.createCompanionMessageNotification(
        receiver_id,
        formatStudentName(req as any),
        threadId,
        content
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

// GET /companion/messages/dm/inbox - Get DM threads with user info for inbox display
export async function getDmInboxController(req: Request, res: Response) {
  try {
    const userId = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { pool } = await import('../../db.js');

    // Get DM threads with last message and unread count
    // This query includes threads where user sent messages even if no reply yet
    const result = await pool.query(
      `WITH thread_info AS (
        SELECT 
          booking_id as thread_id,
          MAX(created_at) as last_message_time,
          COUNT(CASE WHEN receiver_id = $1 AND is_read = false THEN 1 END) as unread_count
        FROM companion_messages
        WHERE thread_type = 'dm'
          AND (sender_id = $1 OR receiver_id = $1)
        GROUP BY booking_id
      ),
      other_user AS (
        -- Get the other user for each thread (most recent message participant)
        SELECT DISTINCT ON (booking_id)
          booking_id as thread_id,
          CASE 
            WHEN sender_id = $1 THEN receiver_id 
            ELSE sender_id 
          END as other_user_id
        FROM companion_messages
        WHERE thread_type = 'dm'
          AND (sender_id = $1 OR receiver_id = $1)
        ORDER BY booking_id, created_at DESC
      )
      SELECT 
        ti.thread_id,
        ou.other_user_id,
        ti.last_message_time,
        ti.unread_count,
        s.first_name,
        s.last_name,
        s.profile_picture,
        s.hall_of_residence,
        s.program,
        cm.content as last_message
      FROM thread_info ti
      JOIN other_user ou ON ti.thread_id = ou.thread_id
      JOIN students s ON ou.other_user_id = s.student_id
      LEFT JOIN companion_messages cm ON cm.booking_id = ti.thread_id
        AND cm.created_at = ti.last_message_time
      ORDER BY ti.last_message_time DESC`,
      [userId]
    );

    const inbox = result.rows.map((row: any) => ({
      thread_id: row.thread_id,
      type: 'companion_dm',
      other_user_id: row.other_user_id,
      last_message: row.last_message || '',
      last_message_time: row.last_message_time,
      unread_count: parseInt(row.unread_count) || 0,
      other_user_profile: {
        first_name: row.first_name,
        last_name: row.last_name,
        profile_picture: row.profile_picture,
        hall_of_residence: row.hall_of_residence,
        program: row.program,
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
