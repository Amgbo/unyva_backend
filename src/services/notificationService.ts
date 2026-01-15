import { NotificationModel, CreateNotificationData } from '../models/notificationModel.js';
import { pool } from '../db.js';
import { Expo, ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';

export class NotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  /**
   * Create and send a notification immediately
   */
  async createAndSend(notificationData: CreateNotificationData): Promise<any> {
    try {
      // Create notification in database
      const notification = await NotificationModel.create(notificationData);

      // Send the notification
      await this.sendNotification(notification);

      return notification;
    } catch (error) {
      console.error('Error creating and sending notification:', error);
      throw error;
    }
  }

  /**
   * Send a notification using appropriate delivery methods
   */
  async sendNotification(notification: any): Promise<void> {
    try {
      const deliveryMethods = notification.delivery_methods || ['push'];

      // Send via push notification if requested
      if (deliveryMethods.includes('push')) {
        await this.sendPushNotification(notification);
      }

      // Update notification status
      await NotificationModel.updateStatus(notification.id, 'sent', {
        sent_at: new Date()
      });

    } catch (error) {
      console.error(`Error sending notification ${notification.id}:`, error);

      // Update notification with error
      await NotificationModel.updateStatus(notification.id, 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Send push notification via Expo
   */
  private async sendPushNotification(notification: any): Promise<void> {
    try {
      // Get user's push token from database
      const userQuery = `
        SELECT push_token FROM students
        WHERE student_id = $1 AND push_token IS NOT NULL
      `;
      const userResult = await pool.query(userQuery, [notification.user_id]);

      if (userResult.rows.length === 0 || !userResult.rows[0].push_token) {
        throw new Error('User has no push token registered');
      }

      const pushToken = userResult.rows[0].push_token;

      // Check if token is valid Expo push token
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      // Create the message
      const message: ExpoPushMessage = {
        to: pushToken as ExpoPushToken,
        title: notification.title,
        body: notification.message,
        data: (typeof notification.data === 'string' && notification.data.length > 0)
          ? JSON.parse(notification.data)
          : (notification.data || {}),
        priority: this.mapPriorityToExpo(notification.priority),
        ttl: 86400, // 24 hours
        expiration: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      // Send the notification
      const ticket = await this.expo.sendPushNotificationsAsync([message]);

      if (ticket[0].status === 'error') {
        throw new Error(`Push notification failed: ${ticket[0].message}`);
      }

      console.log(`Push notification sent successfully to user ${notification.user_id}`);

    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Map notification priority to Expo priority
   */
  private mapPriorityToExpo(priority: string): 'default' | 'normal' | 'high' {
    switch (priority) {
      case 'high':
        return 'high';
      case 'low':
        return 'default';
      case 'medium':
      default:
        return 'normal';
    }
  }

  /**
   * Create order status notification
   */
  async createOrderStatusNotification(
    userId: number,
    orderId: number,
    status: string,
    orderData: any = {}
  ): Promise<any> {
    const statusMessages = {
      confirmed: 'Your order has been confirmed',
      assigned: 'A delivery person has been assigned to your order',
      in_progress: 'Your order is now in progress',
      delivered: 'Your order has been delivered successfully',
      completed: 'Your order has been completed successfully',
      cancelled: 'Your order has been cancelled'
    };

    const title = 'Order Update';
    const message = statusMessages[status as keyof typeof statusMessages] ||
                   `Your order status has been updated to ${status}`;

    const notificationData: CreateNotificationData = {
      user_id: userId,
      type: 'order',
      title,
      message,
      data: {
        order_id: orderId,
        status,
        ...orderData
      },
      priority: 'high',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }

  /**
   * Create new order notification for seller
   */
  async createNewOrderNotification(
    sellerId: number,
    orderId: number,
    orderData: any = {}
  ): Promise<any> {
    const title = 'New Order Received';
    const message = `You have received a new order for ${orderData.product_title || 'your product'}`;

    const notificationData: CreateNotificationData = {
      user_id: sellerId,
      type: 'order',
      title,
      message,
      data: {
        order_id: orderId,
        ...orderData
      },
      priority: 'high',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }

  /**
   * Create delivery status notification
   */
  async createDeliveryStatusNotification(
    userId: number,
    orderId: number,
    deliveryStatus: string,
    orderData: any = {}
  ): Promise<any> {
    const statusMessages = {
      pending: 'Your delivery request is pending assignment',
      assigned: 'A delivery person has been assigned to your order',
      in_progress: 'Your order is being delivered',
      completed: 'Your order has been delivered successfully',
      cancelled: 'Your delivery request has been cancelled'
    };

    const title = 'Delivery Update';
    const message = statusMessages[deliveryStatus as keyof typeof statusMessages] ||
                   `Your delivery status has been updated to ${deliveryStatus}`;

    const notificationData: CreateNotificationData = {
      user_id: userId,
      type: 'delivery',
      title,
      message,
      data: {
        order_id: orderId,
        delivery_status: deliveryStatus,
        ...orderData
      },
      priority: 'high',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }

  /**
   * Create payment status notification
   */
  async createPaymentStatusNotification(
    userId: number,
    orderId: number,
    paymentStatus: string,
    orderData: any = {}
  ): Promise<any> {
    const statusMessages = {
      pending: 'Your payment is being processed',
      paid: 'Your payment has been confirmed',
      failed: 'Your payment failed. Please try again',
      refunded: 'Your payment has been refunded'
    };

    const title = 'Payment Update';
    const message = statusMessages[paymentStatus as keyof typeof statusMessages] ||
                   `Your payment status has been updated to ${paymentStatus}`;

    const notificationData: CreateNotificationData = {
      user_id: userId,
      type: 'payment',
      title,
      message,
      data: {
        order_id: orderId,
        payment_status: paymentStatus,
        ...orderData
      },
      priority: 'high',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }

  /**
   * Process pending notifications (for scheduled notifications)
   */
  async processPendingNotifications(): Promise<void> {
    try {
      const pendingNotifications = await NotificationModel.getPendingNotifications();

      for (const notification of pendingNotifications) {
        try {
          await this.sendNotification(notification);
        } catch (error) {
          console.error(`Failed to send notification ${notification.id}:`, error);

          // Increment retry count
          const updatedNotification = await NotificationModel.incrementRetryCount(notification.id!);

          // If max retries reached, mark as failed
          if (updatedNotification && (updatedNotification.retry_count ?? 0) >= (updatedNotification.max_retries ?? 3)) {
            await NotificationModel.updateStatus(notification.id!, 'failed', {
              error_message: 'Max retries exceeded'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  /**
   * Register push token for a user
   */
  async registerPushToken(userId: number, pushToken: string): Promise<void> {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error('Invalid Expo push token');
      }

      const query = `
        UPDATE students
        SET push_token = $1, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = $2
      `;

      await pool.query(query, [pushToken, userId]);
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: number, options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ notifications: any[]; total: number }> {
    return NotificationModel.findByUserId(userId, options);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<any> {
    return NotificationModel.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<any> {
    return NotificationModel.markAllAsRead(userId);
  }

  /**
   * Send broadcast notification to all users with push tokens
   */
  async sendBroadcastNotification(notificationData: {
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: 'low' | 'medium' | 'high';
    delivery_methods?: string[];
  }): Promise<{ success: number; failed: number; total: number }> {
    try {
      // Get all users with push tokens
      const usersQuery = `
        SELECT student_id, push_token FROM students
        WHERE push_token IS NOT NULL AND push_token != ''
      `;
      const usersResult = await pool.query(usersQuery);

      if (usersResult.rows.length === 0) {
        return { success: 0, failed: 0, total: 0 };
      }

      const users = usersResult.rows;
      let successCount = 0;
      let failedCount = 0;

      // Send notification to each user
      for (const user of users) {
        try {
          const userNotificationData: CreateNotificationData = {
            user_id: user.student_id,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data || {},
            priority: notificationData.priority || 'medium',
            delivery_methods: notificationData.delivery_methods || ['push']
          };

          await this.createAndSend(userNotificationData);
          successCount++;
        } catch (error) {
          console.error(`Failed to send broadcast notification to user ${user.student_id}:`, error);
          failedCount++;
        }
      }

      console.log(`Broadcast notification sent: ${successCount} successful, ${failedCount} failed, ${users.length} total`);

      return {
        success: successCount,
        failed: failedCount,
        total: users.length
      };

    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to all students in a specific university
   */
  async sendSchoolNotification(universityId: number, notificationData: {
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: 'low' | 'medium' | 'high';
    delivery_methods?: string[];
  }): Promise<{ success: number; failed: number; total: number }> {
    try {
      // Get all students in the university with push tokens
      const usersQuery = `
        SELECT student_id, push_token FROM students
        WHERE university_id = $1 AND push_token IS NOT NULL AND push_token != ''
      `;
      const usersResult = await pool.query(usersQuery, [universityId]);

      if (usersResult.rows.length === 0) {
        return { success: 0, failed: 0, total: 0 };
      }

      const users = usersResult.rows;
      let successCount = 0;
      let failedCount = 0;

      // Send notification to each student in the school
      for (const user of users) {
        try {
          const userNotificationData: CreateNotificationData = {
            user_id: user.student_id,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data || {},
            priority: notificationData.priority || 'medium',
            delivery_methods: notificationData.delivery_methods || ['push']
          };

          await this.createAndSend(userNotificationData);
          successCount++;
        } catch (error) {
          console.error(`Failed to send school notification to user ${user.student_id}:`, error);
          failedCount++;
        }
      }

      console.log(`School notification sent to university ${universityId}: ${successCount} successful, ${failedCount} failed, ${users.length} total`);

      return {
        success: successCount,
        failed: failedCount,
        total: users.length
      };

    } catch (error) {
      console.error('Error sending school notification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
