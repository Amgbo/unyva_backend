import { Request, Response } from 'express';
import { acceptBooking, cancelBooking, createNewBooking, declineBooking, getBookingDetails, getBookingsForGuide, getMyBookings } from '../../services/companion/bookingService.js';

export async function createBookingController(req: Request, res: Response) {
  try {
    const freshman_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!freshman_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await createNewBooking({
      freshman_id,
      guide_id: req.body.guide_id,
      help_category: req.body.help_category,
      preferred_date: req.body.preferred_date,
      preferred_time: req.body.preferred_time,
      message: req.body.message ?? null,
    });

    return res.status(201).json({ booking });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to create booking' });
  }
}

export async function listMyBookingsAsFreshmanController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await getMyBookings(student_id);
    return res.json({ bookings });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to list bookings' });
  }
}

export async function listMyBookingsController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await getMyBookings(student_id);
    return res.json({ bookings });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to list bookings' });
  }
}

export async function listBookingsForGuideController(req: Request, res: Response) {
  try {
    const guideId = req.params.guideId;
    if (!guideId) return res.status(400).json({ error: 'guide_id is required' });

    const bookings = await getBookingsForGuide(guideId);
    return res.json({ bookings });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to list guide bookings' });
  }
}

export async function getBookingDetailController(req: Request, res: Response) {
  try {
    const booking = await getBookingDetails(req.params.id);
    return res.json({ booking });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to get booking' });
  }
}

export async function acceptBookingController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await acceptBooking({ bookingId: req.params.id, guide_id: student_id });
    return res.json({ booking });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to accept booking' });
  }
}

export async function declineBookingController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await declineBooking({ bookingId: req.params.id, guide_id: student_id });
    return res.json({ booking });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to decline booking' });
  }
}

export async function cancelBookingController(req: Request, res: Response) {
  try {
    const freshman_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!freshman_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await cancelBooking({ bookingId: req.params.id, freshman_id });
    return res.json({ booking });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to cancel booking' });
  }
}

