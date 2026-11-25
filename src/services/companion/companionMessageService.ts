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
  found_item_id?: number | null;
}) {
  return sendMessage({
    booking_id: params.thread_id,
    sender_id: params.sender_id,
    receiver_id: params.receiver_id,
    content: params.content,
    thread_type: 'dm',
    found_item_id: params.found_item_id ?? null,
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

/**
 * Return the student_ids allowed to read/write a thread, or null if the thread
 * cannot exist. DM threads are `dm:<studentA>:<studentB>`; anything else is a
 * booking id whose participants are the booking student and the guide's owner.
 */
export async function getThreadParticipants(threadId: string): Promise<string[] | null> {
  const id = String(threadId ?? '');
  if (!id) return null;

  if (id.startsWith('dm:')) {
    const parts = id.slice(3).split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return parts;
  }

  const { pool } = await import('../../db.js');
  const { rows } = await pool.query(
    `SELECT b.freshman_id, g.student_id AS guide_student_id
     FROM bookings b
     LEFT JOIN guides g ON b.guide_id = g.id
     WHERE b.id::text = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  return [rows[0].freshman_id, rows[0].guide_student_id]
    .filter((v: unknown) => v != null && v !== '')
    .map(String);
}

export async function isThreadParticipant(threadId: string, userId: string): Promise<boolean> {
  const participants = await getThreadParticipants(threadId);
  return !!participants && participants.includes(String(userId));
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