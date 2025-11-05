import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getAnnouncements, getAnnouncementById, addAnnouncement } from '../controllers/announcementController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

// File filter for images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Configure multer with memory storage for announcements
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Maximum 1 file for announcements
  }
});

const router = Router();

// GET /api/announcements - Fetch all announcements (public)
router.get('/', getAnnouncements);

// GET /api/announcements/:id - Fetch single announcement by ID (public)
router.get('/:id', getAnnouncementById);

// POST /api/announcements - Add new announcement (protected, admin only)
router.post('/', authMiddleware, upload.single('image'), addAnnouncement);

export { router as announcementRouter };
