import { Request, Response } from 'express';
import {
  registerGuide,
  browseGuides,
  getGuideProfile,
  getMyGuide,
  getMyGuides,
  updateMyGuide,
  toggleMyAvailability,
  removeGuide,
} from '../../services/companion/guideService.js';
import { handleControllerError } from '../../utils/apiError.js';

export async function registerGuideController(req: Request, res: Response) {
  try {
    const student_id = (req as any).user?.student_id || (req as any).student?.student_id || req.body.student_id;
    if (!student_id) {
      console.warn('[Companion] registerGuideController rejected: missing student_id');
      return res.status(401).json({ error: 'Missing student_id' });
    }

    const payload = {
      student_id,
      department: req.body.department,
      college: req.body.college,
      hall: req.body.hall,
      year: req.body.year ? Number(req.body.year) : undefined,
      bio: req.body.bio,
      areas_of_expertise: req.body.areas_of_expertise,
    };

    console.log('[Companion] registerGuideController payload:', payload);
    const guide = await registerGuide(payload);
    console.log('[Companion] registerGuideController success:', guide.id);

    return res.status(201).json({ guide });
  } catch (e: any) {
    console.error('[Companion] registerGuideController error:', e);
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to register guide',
      context: 'companion/registerGuide',
    });
  }
}

export async function listGuidesController(req: Request, res: Response) {
  try {
    const { department, availability_status, minRating, onlyActive, q, hall } = req.query as any;

    const guides = await browseGuides({
      department: department || undefined,
      availability_status: availability_status || undefined,
      minRating: minRating !== undefined ? Number(minRating) : undefined,
      onlyActive: onlyActive === 'true' || onlyActive === true,
      q: q || undefined,
      hall: hall || undefined,
    });

    return res.json({ guides });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to list guides',
      context: 'companion/listGuides',
    });
  }
}

export async function getMyGuideController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guide = await getMyGuide(student_id);
    return res.json({ guide });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get guide',
      context: 'companion/getMyGuide',
    });
  }
}

export async function getMyGuidesController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guides = await getMyGuides(student_id);
    return res.json({ guides });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get guides',
      context: 'companion/getMyGuides',
    });
  }
}

export async function getMyDashboardController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guides = await getMyGuides(student_id);
    const guideIds = guides.map((g) => g.id);

    // Show both requests received by the student's guides and bookings ordered
    // by the student, including bookings made with other guides.
    const { pool } = await import('../../db.js');
    const guidePlaceholders = guideIds.map((_, i) => `$${i + 2}`).join(',');
    const bookingScope = guideIds.length > 0
      ? `b.freshman_id = $1 OR b.guide_id IN (${guidePlaceholders})`
      : 'b.freshman_id = $1';
    const result = await pool.query(
      `SELECT
         b.*,
         g.student_id AS guide_student_id,
         sf.first_name AS freshman_first_name,
         sf.last_name AS freshman_last_name,
         sf.profile_picture AS freshman_profile_picture,
         sg.first_name AS guide_first_name,
         sg.last_name AS guide_last_name,
         sg.profile_picture AS guide_profile_picture
       FROM bookings b
       LEFT JOIN guides g ON g.id = b.guide_id
       LEFT JOIN students sf ON sf.student_id = b.freshman_id
       LEFT JOIN students sg ON sg.student_id = g.student_id
       WHERE ${bookingScope}
       ORDER BY b.created_at DESC;`,
      [student_id, ...guideIds]
    );
    const bookings = result.rows;

    // Compute unread message counts for each booking thread.
    const bookingIds = bookings.map((b) => b.id);
    const unreadCounts: Record<string, number> = {};
    if (bookingIds.length > 0) {
      const placeholders = bookingIds.map((_, i) => `$${i + 2}`).join(',');
      const result = await pool.query(
        `SELECT booking_id, COUNT(*)::int AS count
         FROM companion_messages
         WHERE receiver_id = $1 AND is_read = false AND booking_id IN (${placeholders})
         GROUP BY booking_id;`,
        [student_id, ...bookingIds]
      );
      for (const row of result.rows) {
        unreadCounts[row.booking_id] = row.count;
      }
    }

    // Also count direct-message threads (dm: prefix) using thread_type column.
    const dmResult = await pool.query(
      `SELECT booking_id, COUNT(*)::int AS count
       FROM companion_messages
       WHERE receiver_id = $1 AND is_read = false AND thread_type = 'dm'
       GROUP BY booking_id;`,
      [student_id]
    );
    for (const row of dmResult.rows) {
      unreadCounts[row.booking_id] = row.count;
    }

    return res.json({
      dashboard: {
        guides,
        guideCount: guides.length,
        bookings,
        unread_counts: unreadCounts,
      },
    });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to load dashboard',
      context: 'companion/getMyDashboard',
    });
  }
}

export async function getCompanionBadgeController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const { pool } = await import('../../db.js');
    const result = await pool.query(
      `SELECT 
        EXISTS(
          SELECT 1 FROM companion_messages 
          WHERE receiver_id = $1 AND is_read = false
        ) AS has_unread,
        EXISTS(
          SELECT 1 FROM bookings b
          WHERE (
            b.freshman_id = $1 
            OR b.guide_id IN (SELECT id FROM guides WHERE student_id = $1)
          ) AND b.status = 'pending'
        ) AS has_pending;`,
      [student_id]
    );

    const row = result.rows[0] || {};
    const hasUnread = Boolean(row.has_unread);
    const hasPending = Boolean(row.has_pending);
    const hasBadge = hasUnread || hasPending;

    return res.json({
      hasBadge,
      hasUnread,
      hasPending,
    });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get companion badge status',
      context: 'companion/getCompanionBadge',
    });
  }
}

export async function updateMyGuideController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guideId = req.body.guide_id ?? req.params.guideId;
    if (!guideId) return res.status(400).json({ error: 'guide_id is required' });

    const guide = await updateMyGuide({
      guideId,
      student_id,
      department: req.body.department ?? null,
      college: req.body.college ?? null,
      hall: req.body.hall ?? null,
      year: req.body.year !== undefined && req.body.year !== null ? Number(req.body.year) : null,
      bio: req.body.bio ?? null,
      areas_of_expertise: req.body.areas_of_expertise ?? null,
      is_active: req.body.is_active,
    });

    return res.json({ guide });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to update guide',
      context: 'companion/updateMyGuide',
    });
  }
}

export async function toggleAvailabilityController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guideId = req.body.guide_id ?? req.params.guideId;
    if (!guideId) return res.status(400).json({ error: 'guide_id is required' });

    const guide = await toggleMyAvailability({
      guideId,
      student_id,
      availability_status: req.body.availability_status,
    });

    return res.json({ guide });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to toggle availability',
      context: 'companion/toggleAvailability',
    });
  }
}

export async function getGuideByIdController(req: Request, res: Response) {
  try {
    const guideId = req.params.guideId;
    // guideId may be either the numeric primary key (uuid) or the student_id.
    // Try by id first; if that fails or the id is not a valid uuid, look up by student_id.
    let guide = await getGuideProfile(guideId);

    if (!guide) {
      guide = await getMyGuide(guideId);
    }

    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    return res.json({ guide });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to get guide',
      context: 'companion/getGuideById',
    });
  }
}

export async function deleteGuideController(req: Request, res: Response) {
  try {
    const student_id = (req as any).user?.student_id || (req as any).student?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guideId = req.params.guideId || req.body?.guide_id;
    const deleted = await removeGuide({ guideId, student_id });

    if (!deleted) {
      return res.status(404).json({ error: 'Guide profile not found or already deleted' });
    }

    return res.json({ success: true, message: 'Guide profile deleted successfully' });
  } catch (e: any) {
    return handleControllerError(res, e, {
      statusCode: 400,
      publicError: 'Failed to delete guide profile',
      context: 'companion/deleteGuide',
    });
  }
}
