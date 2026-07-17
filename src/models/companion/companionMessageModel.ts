import { pool } from '../../db.js';

export type ThreadType = 'booking' | 'dm';

export type CompanionMessage = {
  id: string;
  booking_id: string; // Now TEXT - can be a booking UUID or a DM thread ID (dm:userA:userB)
  thread_type: ThreadType;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export async function sendMessage(params: {
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  thread_type?: ThreadType;
}): Promise<CompanionMessage> {
  const { booking_id, sender_id, receiver_id, content, thread_type = 'booking' } = params;

  const { rows } = await pool.query(
    `
    INSERT INTO companion_messages (booking_id, sender_id, receiver_id, content, thread_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [booking_id, sender_id, receiver_id, content, thread_type]
  );

  return rows[0] as CompanionMessage;
}

export async function getMessagesForBooking(bookingId: string): Promise<CompanionMessage[]> {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM companion_messages
    WHERE booking_id = $1 AND thread_type = 'booking'
    ORDER BY created_at ASC;
    `,
    [bookingId]
  );
  return rows as CompanionMessage[];
}

export async function getMessagesForThread(threadId: string): Promise<CompanionMessage[]> {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM companion_messages
    WHERE booking_id = $1
    ORDER BY created_at ASC;
    `,
    [threadId]
  );
  return rows as CompanionMessage[];
}

export async function getDmThreadsForUser(userId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `
    SELECT DISTINCT booking_id
    FROM companion_messages
    WHERE thread_type = 'dm'
      AND (sender_id = $1 OR receiver_id = $1)
    ORDER BY MAX(created_at) DESC;
    `,
    [userId]
  );
  return rows.map((r: any) => r.booking_id);
}

export async function markMessagesRead(params: { booking_id: string; receiver_id: string }): Promise<void> {
  const { booking_id, receiver_id } = params;

  await pool.query(
    `
    UPDATE companion_messages
    SET is_read = true
    WHERE booking_id = $1
      AND receiver_id = $2
      AND is_read = false;
    `,
    [booking_id, receiver_id]
  );
}

export async function getUnreadDmCount(userId: string): Promise<Record<string, number>> {
  const { rows } = await pool.query(
    `
    SELECT booking_id, COUNT(*)::int AS count
    FROM companion_messages
    WHERE receiver_id = $1
      AND is_read = false
      AND thread_type = 'dm'
    GROUP BY booking_id;
    `,
    [userId]
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.booking_id] = row.count;
  }
  return counts;
}