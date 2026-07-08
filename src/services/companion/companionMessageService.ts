import { getMessagesForBooking, sendMessage } from '../../models/companion/companionMessageModel.js';

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

