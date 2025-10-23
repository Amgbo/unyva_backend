import { Router } from 'express';
import multer from 'multer';
import {
  registerStep1,
  registerStep2,
  verifyEmail,
  loginStudent,
  getStudentProfile,
  getStudentProfileById,
  updateStudentProfile,
} from '../controllers/studentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Configure multer with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Step 1: Basic registration
router.post('/register-step1', registerStep1);

// Step 2: Complete registration with files
router.post('/register-step2', upload.fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'id_card', maxCount: 1 },
]), registerStep2);

// Email verification
router.get('/verify-email', verifyEmail);

// Login
router.post('/login', loginStudent);

// Get logged-in student profile (protected)
router.get('/profile', authMiddleware, getStudentProfile);

// Get student profile by ID (public, but limited info)
router.get('/profile/:studentId', getStudentProfileById);

// Update student profile (protected)
router.put('/profile', authMiddleware, upload.any(), updateStudentProfile);

export { router as studentRouter };
