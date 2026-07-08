import { Request, Response } from 'express';
import { confirmGuideSession, endFreshmanSession, getSession, getSessionByBooking, startFreshmanSession } from '../../services/companion/sessionService.js';
import { completeBooking } from '../../services/companion/bookingService.js';
export async function startSessionController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const { session, pin } = await startFreshmanSession({ bookingId: req.params.bookingId, freshman_id: student_id });
    return res.json({ session, pin });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to start session' });
  }
}

export async function confirmSessionController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const session = await confirmGuideSession({
      sessionId: req.params.id,
      pin: req.body.pin,
      guide_id: student_id,
    });

    return res.json({ session });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to confirm session' });
  }
}

export async function endSessionController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const session = await endFreshmanSession({ sessionId: req.params.id, freshman_id: student_id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Update booking + guide counters
    await completeBooking({ bookingId: session.booking_id, completedBy: student_id });

    // Increment guide completed_sessions (need guide_id; derive from booking record would be ideal.
    // v1 placeholder: controller cannot derive guide_id without more joins; skip until booking details include it.

    return res.json({ session });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to end session' });
  }
}

export async function getSessionController(req: Request, res: Response) {
  try {
    const session = await getSession(req.params.id);
    return res.json({ session });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to get session' });
  }
}

export async function getSessionByBookingController(req: Request, res: Response) {
  try {
    const session = await getSessionByBooking(req.params.bookingId);
    return res.json({ session });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to get session by booking' });
  }
}

