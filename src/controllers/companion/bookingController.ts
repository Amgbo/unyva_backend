import { Request, Response } from 'express';
import { acceptBooking, cancelBooking, createNewBooking, declineBooking, getBookingDetails, getBookingsForGuide, getMyBookings, removeBooking, updateBooking } from '../../services/companion/bookingService.js';
import { getGuideById } from '../../models/companion/guideModel.js';
import { notificationService } from '../../services/notificationService.js';
import { handleControllerError } from '../../utils/apiError.js';
import { getStudentDisplayName } from '../../utils/studentName.js';

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
          await getStudentDisplayName(freshman_id, 'A student'),
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
          await getStudentDisplayName(student_id, 'Your guide')
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
          await getStudentDisplayName(student_id, 'Your guide')
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
            await getStudentDisplayName(freshman_id, 'A student')
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

export async function deleteBookingController(req: Request, res: Response) {
  try {
    const freshman_id = (req as any).student?.student_id || (req as any).user?.student_id || (req as any).user?.id;
    if (!freshman_id) return res.status(401).json({ error: 'Unauthorized' });

    const booking = await removeBooking({ bookingId: req.params.id, freshman_id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // If deleted while pending or accepted, inform the guide that the booking was removed/cancelled
    if (booking.guide_id && (booking.status === 'pending' || booking.status === 'accepted')) {
      try {
        const guide = await getGuideById(booking.guide_id);
        if (guide?.student_id) {
          await notificationService.createCompanionBookingStatusNotification(
            guide.student_id,
            booking.id,
            'cancelled',
            await getStudentDisplayName(freshman_id, 'A student')
          );
        }
      } catch (notifyError) {
        console.error('[Companion] Failed to send delete notification to guide:', notifyError);
      }
    }

    return res.json({ success: true, booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to delete booking',
      context: 'companion/deleteBooking',
    });
  }
}

export async function updateBookingController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const { help_category, preferred_date, preferred_time, message } = req.body;

    const booking = await updateBooking({
      bookingId: req.params.id,
      userId: student_id,
      help_category,
      preferred_date,
      preferred_time,
      message,
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Notify the other party about the update
    try {
      const recipientStudentId = String(booking.freshman_id) === String(student_id)
        ? booking.guide_student_id
        : booking.freshman_id;
      if (recipientStudentId) {
        await notificationService.createCompanionBookingStatusNotification(
          recipientStudentId,
          booking.id,
          'rescheduled',
          await getStudentDisplayName(student_id, 'Your companion')
        );
      }
    } catch (notifyError) {
      console.error('[Companion] Failed to send update notification:', notifyError);
    }

    return res.json({ booking });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to update booking',
      context: 'companion/updateBooking',
    });
  }
}
