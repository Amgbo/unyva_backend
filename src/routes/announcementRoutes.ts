import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import { getAnnouncements, getAnnouncementById, addAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

// Create conditional multer: announcements folder for local storage
const upload = createMulter(undefined, 'announcements');

const router = Router();

// GET /api/announcements - Fetch all announcements (public)
router.get('/', getAnnouncements);

// GET /api/announcements/:id - Fetch single announcement by ID (public)
router.get('/:id', getAnnouncementById);

// POST /api/announcements - Add new announcement (protected, admin only)
router.post('/', authMiddleware, upload.single('image'), addAnnouncement);

// DELETE /api/announcements/:id - Delete announcement (protected, admin only)
router.delete('/:id', authMiddleware, deleteAnnouncement);

export { router as announcementRouter };
