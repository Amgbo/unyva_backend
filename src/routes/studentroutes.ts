import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import {
  registerStep1,
  completeRegistration,
  verifyEmail,
  loginStudent,
  getStudentProfile,
  getStudentProfileById,
  updateStudentProfile,
  deleteAccount,
} from '../controllers/studentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Create conditional multer instance: profile_picture -> profiles, id_card -> idcards
const upload = createMulter({ profile_picture: 'profiles', id_card: 'idcards' }, 'profiles');

// Step 1: Basic registration
router.post('/register-step1', registerStep1);

// Complete registration: Single step with all data
router.post('/complete-registration', upload.fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'id_card', maxCount: 1 },
]), completeRegistration);

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

// Delete account (protected)
router.delete('/delete-account', authMiddleware, deleteAccount);

export { router as studentRouter };
