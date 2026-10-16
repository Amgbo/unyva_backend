import { Router } from 'express';
import multer from 'multer';
import { createMulter } from '../config/multer.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createCampusToday, deleteCampusToday, getCampusToday, getCampusTodayById, updateCampusToday } from '../controllers/campusTodayController.js';

const router = Router();
const upload = createMulter(undefined, 'campus_today');

const handleUploadError = (err: unknown, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError || err instanceof Error) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  next(err);
};

router.get('/', getCampusToday);
router.get('/:id', getCampusTodayById);
router.post('/', authMiddleware, upload.single('image'), createCampusToday, handleUploadError);
router.put('/:id', authMiddleware, upload.single('image'), updateCampusToday, handleUploadError);
router.patch('/:id', authMiddleware, upload.single('image'), updateCampusToday, handleUploadError);
router.delete('/:id', authMiddleware, deleteCampusToday);

export default router;
