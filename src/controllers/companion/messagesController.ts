import { Request, Response } from 'express';
import { countUnreadMessages, getBookingMessages, markMessagesRead, sendCompanionMessage } from '../../services/companion/companionMessageService.js';
import { notificationService } from '../../services/notificationService.js';

function buildDirectThreadId(a: string, b: string): string {
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

    const threadId = booking_id || buildDirectThreadId(sender_id, receiver_id);

    const message = await sendCompanionMessage({
      booking_id: threadId,
      sender_id,
      receiver_id,
      content,
    });

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
    return res.status(400).json({ error: e.message ?? 'Failed to send message' });
  }
}

export async function getMessagesController(req: Request, res: Response) {
  try {
    const bookingId = req.params.bookingId;
    const messages = await getBookingMessages(bookingId);
    return res.json({ messages });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to get messages' });
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
    return res.status(400).json({ error: e.message ?? 'Failed to mark messages as read' });
  }
}

