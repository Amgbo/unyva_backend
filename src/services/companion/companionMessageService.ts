import { getMessagesForBooking, markMessagesRead as markMessagesReadModel, sendMessage } from '../../models/companion/companionMessageModel.js';

export async function sendCompanionMessage(params: {
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
}) {
  return sendMessage(params);
}

export async function getBookingMessages(bookingId: string) {
  return getMessagesForBooking(bookingId);
}

export async function markMessagesRead(params: { booking_id: string; receiver_id: string }) {
  return markMessagesReadModel(params);
}

export async function countUnreadMessages(params: { booking_id: string; receiver_id: string }): Promise<number> {
  const { booking_id, receiver_id } = params;
  const { pool } = await import('../../db.js');
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM companion_messages
     WHERE booking_id = $1 AND receiver_id = $2 AND is_read = false`,
    [booking_id, receiver_id]
  );
  return result.rows[0]?.count ?? 0;
}

