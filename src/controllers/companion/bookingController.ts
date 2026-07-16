import { Request, Response } from 'express';
import { acceptBooking, cancelBooking, createNewBooking, declineBooking, getBookingDetails, getBookingsForGuide, getMyBookings } from '../../services/companion/bookingService.js';
import { getGuideById } from '../../models/companion/guideModel.js';
import { notificationService } from '../../services/notificationService.js';
import { handleControllerError } from '../../utils/apiError.js';

function formatStudentName(student: any): string {
  const full = [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim();
  return full || `@${student?.student_id}` || 'A student';
}

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

    // Notify the guide owner about the new booking request.
    try {
      const guide = await getGuideById(booking.guide_id);
      if (guide?.student_id) {
        await notificationService.createCompanionBookingRequestNotification(
          guide.student_id,
          booking.id,
          formatStudentName(req as any),
          booking.help_category
        );
      }
    } catch (notifyError) {
      console.error('[Companion] Failed to send booking request notification:', notifyError);
    }

    return res.status(201).json({ booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to create booking',
      context: 'companion/createBooking',
    });
  }
}

export async function listMyBookingsAsFreshmanController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await getMyBookings(student_id);
    return res.json({ bookings });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to list bookings',
      context: 'companion/listMyBookingsAsFreshman',
    });
  }
}

export async function listMyBookingsController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await getMyBookings(student_id);
    return res.json({ bookings });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to list bookings',
      context: 'companion/listMyBookings',
    });
  }
}

export async function listBookingsForGuideController(req: Request, res: Response) {
  try {
    const guideId = req.params.guideId;
    if (!guideId) return res.status(400).json({ error: 'guide_id is required' });

    const bookings = await getBookingsForGuide(guideId);
    return res.json({ bookings });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to list guide bookings',
      context: 'companion/listBookingsForGuide',
    });
  }
}

export async function getBookingDetailController(req: Request, res: Response) {
  try {
    const booking = await getBookingDetails(req.params.id);
    return res.json({ booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get booking',
      context: 'companion/getBookingDetail',
    });
  }
}

export async function acceptBookingController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await acceptBooking({ bookingId: req.params.id, guide_id: student_id });

    if (booking?.freshman_id) {
      try {
        await notificationService.createCompanionBookingStatusNotification(
          booking.freshman_id,
          booking.id,
          'accepted',
          formatStudentName(req as any)
        );
      } catch (notifyError) {
        console.error('[Companion] Failed to send accept notification:', notifyError);
      }
    }

    return res.json({ booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to accept booking',
      context: 'companion/acceptBooking',
    });
  }
}

export async function declineBookingController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await declineBooking({ bookingId: req.params.id, guide_id: student_id });

    if (booking?.freshman_id) {
      try {
        await notificationService.createCompanionBookingStatusNotification(
          booking.freshman_id,
          booking.id,
          'declined',
          formatStudentName(req as any)
        );
      } catch (notifyError) {
        console.error('[Companion] Failed to send decline notification:', notifyError);
      }
    }

    return res.json({ booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to decline booking',
      context: 'companion/declineBooking',
    });
  }
}

export async function cancelBookingController(req: Request, res: Response) {
  try {
    const freshman_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!freshman_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await cancelBooking({ bookingId: req.params.id, freshman_id });

    if (booking?.guide_id) {
      try {
        const guide = await getGuideById(booking.guide_id);
        if (guide?.student_id) {
          await notificationService.createCompanionBookingStatusNotification(
            guide.student_id,
            booking.id,
            'cancelled',
            formatStudentName(req as any)
          );
        }
      } catch (notifyError) {
        console.error('[Companion] Failed to send cancel notification:', notifyError);
      }
    }

    return res.json({ booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to cancel booking',
      context: 'companion/cancelBooking',
    });
  }
}
