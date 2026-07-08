import { pool } from '../../db.js';

export type CompanionMessage = {
  id: string;
  booking_id: string;
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
}): Promise<CompanionMessage> {
  const { booking_id, sender_id, receiver_id, content } = params;

  const { rows } = await pool.query(
    `
    INSERT INTO companion_messages (booking_id, sender_id, receiver_id, content)
    VALUES ($1,$2,$3,$4)
    RETURNING *;
    `,
    [booking_id, sender_id, receiver_id, content]
  );

  return rows[0] as CompanionMessage;
}

export async function getMessagesForBooking(bookingId: string): Promise<CompanionMessage[]> {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM companion_messages
    WHERE booking_id = $1
    ORDER BY created_at ASC;
    `,
    [bookingId]
  );
  return rows as CompanionMessage[];
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

