import { Router } from 'express';
import { ThroneController } from '../controllers/throneController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// All throne routes require authentication
router.use(authMiddleware);

// Get current throne holders
router.get('/current', ThroneController.getCurrentThroneHolders);

// Get throne holders for a specific week
router.get('/week/:weekStart', ThroneController.getThroneHoldersForWeek);

// Get user's throne history
router.get('/users/:userId', ThroneController.getUserThroneHistory);

// Get throne statistics
router.get('/stats', ThroneController.getThroneStats);

// Get throne types
router.get('/types', ThroneController.getThroneTypes);

// Admin endpoint to calculate weekly thrones
router.post('/calculate', ThroneController.calculateWeeklyThrones);

export default router;
