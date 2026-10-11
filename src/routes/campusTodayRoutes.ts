import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createCampusToday, deleteCampusToday, getCampusToday, getCampusTodayById, updateCampusToday } from '../controllers/campusTodayController.js';

const router = Router();
const upload = createMulter(undefined, 'campus_today');

router.get('/', getCampusToday);
router.get('/:id', getCampusTodayById);
router.post('/', authMiddleware, upload.single('image'), createCampusToday);
router.put('/:id', authMiddleware, upload.single('image'), updateCampusToday);
router.patch('/:id', authMiddleware, upload.single('image'), updateCampusToday);
router.delete('/:id', authMiddleware, deleteCampusToday);

export default router;
