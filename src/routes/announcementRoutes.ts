import { Router } from 'express';
import { getAnnouncements, addAnnouncement } from '../controllers/announcementController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/announcements - Fetch all announcements (public)
router.get('/', getAnnouncements);

// POST /api/announcements - Add new announcement (protected, admin only)
router.post('/', authMiddleware, addAnnouncement);

export { router as announcementRouter };
