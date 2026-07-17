import {
  getMessagesForBooking,
  getMessagesForThread,
  getDmThreadsForUser,
  getUnreadDmCount,
  markMessagesRead as markMessagesReadModel,
  sendMessage,
  type ThreadType,
} from '../../models/companion/companionMessageModel.js';

export async function sendCompanionMessage(params: {
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  thread_type?: ThreadType;
}) {
  return sendMessage(params);
}

export async function sendDirectMessage(params: {
  sender_id: string;
  receiver_id: string;
  content: string;
  thread_id: string; // dm:userA:userB format
}) {
  return sendMessage({
    booking_id: params.thread_id,
    sender_id: params.sender_id,
    receiver_id: params.receiver_id,
    content: params.content,
    thread_type: 'dm',
  });
}

export async function getBookingMessages(bookingId: string) {
  return getMessagesForBooking(bookingId);
}

export async function getThreadMessages(threadId: string) {
  return getMessagesForThread(threadId);
}

export async function getUserDmThreads(userId: string) {
  return getDmThreadsForUser(userId);
}

export async function getUnreadDmCounts(userId: string) {
  return getUnreadDmCount(userId);
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