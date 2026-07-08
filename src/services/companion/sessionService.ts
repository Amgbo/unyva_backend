import { confirmSession, endSession, getSessionById, getSessionByBookingId, startSession, type Session } from '../../models/companion/sessionModel.js';

export async function startFreshmanSession(params: { bookingId: string; freshman_id: string }): Promise<{ session: Session; pin: string }> {
  return startSession({ booking_id: params.bookingId, started_by: params.freshman_id });
}

export async function confirmGuideSession(params: { sessionId: string; pin: string; guide_id: string }): Promise<Session | null> {
  // Note: booking<->session links exist, but we validate pin + session id here.
  // Ownership validation is expected to be done in controller/service layer using booking->guide mapping (v1 can be relaxed).
  const existing = await getSessionById(params.sessionId);
  if (!existing) return null;
  return confirmSession({ sessionId: params.sessionId, pin: params.pin, confirmed_by: params.guide_id });
}

export async function endFreshmanSession(params: { sessionId: string; freshman_id: string }): Promise<Session | null> {
  return endSession({ sessionId: params.sessionId, ended_by: params.freshman_id });
}

export async function getSession(sessionId: string): Promise<Session | null> {
  return getSessionById(sessionId);
}

export async function getSessionByBooking(bookingId: string): Promise<Session | null> {
  return getSessionByBookingId(bookingId);
}

