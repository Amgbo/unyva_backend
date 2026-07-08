import { Request, Response } from 'express';
import {
  registerGuide,
  browseGuides,
  getGuideProfile,
  getMyGuide,
  getMyGuides,
  updateMyGuide,
  toggleMyAvailability,
} from '../../services/companion/guideService.js';

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
    return res.status(400).json({ error: e.message ?? 'Failed to register guide' });
  }
}

export async function listGuidesController(req: Request, res: Response) {
  try {
    const { department, availability_status, minRating, onlyActive } = req.query as any;

    const guides = await browseGuides({
      department: department || undefined,
      availability_status: availability_status || undefined,
      minRating: minRating !== undefined ? Number(minRating) : undefined,
      onlyActive: onlyActive === 'true' || onlyActive === true,
    });

    return res.json({ guides });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to list guides' });
  }
}

export async function getMyGuideController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guide = await getMyGuide(student_id);
    return res.json({ guide });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to get guide' });
  }
}

export async function getMyGuidesController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guides = await getMyGuides(student_id);
    return res.json({ guides });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to get guides' });
  }
}

export async function getMyDashboardController(req: Request, res: Response) {
  try {
    const student_id = (req as any).student?.student_id || (req as any).user?.student_id;
    if (!student_id) return res.status(401).json({ error: 'Unauthorized' });

    const guides = await getMyGuides(student_id);
    const guideIds = guides.map((g) => g.id);

    // Aggregate pending bookings across all of the student's guides.
    const { pool } = await import('../../db.js');
    let bookings: any[] = [];
    if (guideIds.length > 0) {
      const placeholders = guideIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await pool.query(
        `SELECT b.*, s.first_name, s.last_name
         FROM bookings b
         LEFT JOIN students s ON s.student_id = b.freshman_id
         WHERE b.guide_id IN (${placeholders})
         ORDER BY b.created_at DESC;`,
        guideIds
      );
      bookings = result.rows;
    }

    return res.json({
      dashboard: {
        guides,
        guideCount: guides.length,
        bookings,
      },
    });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Failed to load dashboard' });
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
    return res.status(400).json({ error: e.message ?? 'Failed to update guide' });
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
    return res.status(400).json({ error: e.message ?? 'Failed to toggle availability' });
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
    return res.status(400).json({ error: e.message ?? 'Failed to get guide' });
  }
}

