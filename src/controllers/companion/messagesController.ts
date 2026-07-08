import { Request, Response } from 'express';
import { getBookingMessages, sendCompanionMessage } from '../../services/companion/companionMessageService.js';

function buildDirectThreadId(a: string, b: string): string {
  const [x, y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
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

