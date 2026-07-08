import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  registerPushToken,
  createTestNotification,
  getAllNotifications,
  getNotificationStats,
  sendBroadcastNotification,
  sendSchoolNotification,
  deleteNotification
} from '../controllers/notificationController.js';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// User notification routes
router.get('/', getUserNotifications);
router.put('/:id/read', markNotificationAsRead);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.post('/register-token', registerPushToken);
router.post('/test', createTestNotification);

// Admin notification routes
router.get('/admin/all', getAllNotifications);
router.get('/admin/stats', getNotificationStats);
router.post('/admin/broadcast', sendBroadcastNotification);
router.post('/admin/school', sendSchoolNotification);
router.delete('/admin/:id', deleteNotification);

export default router;
