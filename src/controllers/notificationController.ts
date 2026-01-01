import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService.js';
import { NotificationModel } from '../models/notificationModel.js';

// Get user's notifications
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;
    const { status, type, limit = 20, offset = 0 } = req.query;

    const options = {
      status: status as string,
      type: type as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    };

    const result = await notificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;
    const notificationId = parseInt(req.params.id);

    const notification = await notificationService.markAsRead(notificationId);

    // Verify the notification belongs to the user
    if (notification && notification.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
    });
  }
};

// Register push token
export const registerPushToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    await notificationService.registerPushToken(userId, pushToken);

    res.json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
    });
  }
};

// Alias for registerPushToken to match frontend expectation
export const registerToken = registerPushToken;

// Create test notification
export const createTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    const notificationData = {
      user_id: userId,
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'low' as 'low' | 'medium' | 'high',
      delivery_methods: ['push'],
    };

    const notification = await notificationService.createAndSend(notificationData);

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
    });
  }
};

// Admin: Get all notifications
export const getAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    // Check if user is admin
    if (userId !== '22243185') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { status, type, limit = 50, offset = 0 } = req.query;

    const options = {
      status: status as string,
      type: type as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    };

    const result = await NotificationModel.findAll(options);

    res.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
    });
  } catch (error) {
    console.error('Error getting all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
    });
  }
};

// Admin: Get notification statistics
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    // Check if user is admin
    if (userId !== '22243185') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const stats = await NotificationModel.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification stats',
    });
  }
};

// Admin: Send broadcast notification
export const sendBroadcastNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    // Check if user is admin
    if (userId !== '22243185') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { title, message, type = 'system', priority = 'medium' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    const result = await notificationService.sendBroadcastNotification({
      title,
      message,
      type,
      priority,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification',
    });
  }
};

// Admin: Send notification to all students in a school
export const sendSchoolNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    // Check if user is admin
    if (userId !== '22243185') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { universityId, title, message, type = 'announcement', priority = 'medium' } = req.body;

    if (!universityId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'University ID, title, and message are required',
      });
    }

    const result = await notificationService.sendSchoolNotification(universityId, {
      title,
      message,
      type,
      priority,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error sending school notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send school notification',
    });
  }
};

// Admin: Delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.student_id;

    // Check if user is admin
    if (userId !== '22243185') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const notificationId = parseInt(req.params.id);

    await NotificationModel.delete(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
};
