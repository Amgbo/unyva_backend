import { Router } from 'express';
import multer from 'multer';
import { createMulter } from '../config/multer.js';
import { getAnnouncements, getAnnouncementById, addAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

// Create conditional multer: announcements folder for local storage
const upload = createMulter(undefined, 'announcements');

const router = Router();

const handleUploadError = (err: unknown, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError || err instanceof Error) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  next(err);
};

// GET /api/announcements - Fetch all announcements (public)
router.get('/', getAnnouncements);

// GET /api/announcements/:id - Fetch single announcement by ID (public)
router.get('/:id', getAnnouncementById);

// POST /api/announcements - Add new announcement (protected, admin only)
router.post('/', authMiddleware, upload.single('image'), addAnnouncement, handleUploadError);

// DELETE /api/announcements/:id - Delete announcement (protected, admin only)
router.delete('/:id', authMiddleware, deleteAnnouncement);

export { router as announcementRouter };
