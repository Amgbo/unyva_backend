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
  private validateNotificationData(data: CreateNotificationData): void {
    if (!data.user_id || typeof data.user_id !== 'string') {
      throw new Error('Invalid user_id: must be a non-empty string');
    }
    
    if (!data.type || typeof data.type !== 'string') {
      throw new Error('Invalid type: must be a non-empty string');
    }
    
    if (!data.title || typeof data.title !== 'string' || data.title.length === 0) {
      throw new Error('Invalid title: must be a non-empty string');
    }
    
    if (!data.message || typeof data.message !== 'string' || data.message.length === 0) {
      throw new Error('Invalid message: must be a non-empty string');
    }
    
    if (data.title.length > 255) {
      throw new Error('Title exceeds maximum length of 255 characters');
    }
    
    if (data.message.length > 1000) {
      throw new Error('Message exceeds maximum length of 1000 characters');
    }
    
    if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
      throw new Error('Invalid priority: must be low, medium, or high');
    }
    
    if (data.delivery_methods && !Array.isArray(data.delivery_methods)) {
      throw new Error('Invalid delivery_methods: must be an array');
    }
  }

  async createAndSend(notificationData: CreateNotificationData): Promise<any> {
    try {
      // Validate before creating
      this.validateNotificationData(notificationData);
      
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

      console.log(`📤 Push notification ticket for user ${notification.user_id}:`, ticket[0]);

      if (ticket[0].status === 'error') {
        console.error(`❌ Push notification failed for user ${notification.user_id}:`, ticket[0].message);
        throw new Error(`Push notification failed: ${ticket[0].message}`);
      }

      console.log(`✅ Push notification sent successfully to user ${notification.user_id}`);

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
    userId: string,
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
    sellerId: string,
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
    userId: string,
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
    userId: string,
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
   * Uses exponential backoff for retries
   */
  async processPendingNotifications(): Promise<void> {
    try {
      const pendingNotifications = await NotificationModel.getPendingNotifications();

      for (const notification of pendingNotifications) {
        try {
          // Calculate delay based on retry count using exponential backoff
          const retryCount = notification.retry_count || 0;
          const baseDelay = 1000; // 1 second base delay
          const maxDelay = 300000; // 5 minutes max delay
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
          
          // Apply exponential backoff delay if this is a retry
          if (retryCount > 0) {
            console.log(`⏳ Waiting ${delay}ms before retry for notification ${notification.id}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          await this.sendNotification(notification);
        } catch (error) {
          console.error(`Failed to send notification ${notification.id}:`, error);

          // Increment retry count
          const updatedNotification = await NotificationModel.incrementRetryCount(notification.id!);
          const currentRetry = updatedNotification?.retry_count || 0;
          const maxRetries = notification.max_retries || 3;

          // If max retries reached, mark as failed
          if (currentRetry >= maxRetries) {
            await NotificationModel.updateStatus(notification.id!, 'failed', {
              error_message: `Max retries (${maxRetries}) exceeded. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            console.error(`❌ Notification ${notification.id} marked as failed after ${currentRetry} retries`);
          } else {
            // Schedule next retry with backoff
            const nextDelay = Math.min(1000 * Math.pow(2, currentRetry), 300000);
            console.log(`🔄 Notification ${notification.id} will retry in ${nextDelay}ms (attempt ${currentRetry + 1}/${maxRetries})`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  /**
   * Register push token for a user with validation
   */
  async registerPushToken(userId: string, pushToken: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate the push token format
      if (!pushToken || pushToken.trim().length === 0) {
        throw new Error('Push token cannot be empty');
      }

      // STRICT validation - reject invalid tokens immediately
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new Error(`Invalid Expo push token format: ${(pushToken as string).substring(0, 20)}...`);
      }

      // Validate token length (reasonable bounds)
      if (pushToken.length < 10 || pushToken.length > 500) {
        throw new Error('Push token has invalid length');
      }

      const query = `
        UPDATE students
        SET push_token = $1, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = $2
        RETURNING student_id
      `;

      const result = await pool.query(query, [pushToken, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      console.log(`✅ Valid push token registered for user ${userId}`);
      return { 
        success: true, 
        message: 'Push token registered successfully'
      };
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Validate a push token without registering it
   */
  async validatePushToken(pushToken: string): Promise<{ valid: boolean; type: string; message: string }> {
    try {
      if (!pushToken || pushToken.trim().length === 0) {
        return { valid: false, type: 'unknown', message: 'Push token is empty' };
      }

      if (pushToken.length < 10 || pushToken.length > 500) {
        return { valid: false, type: 'unknown', message: 'Push token has invalid length' };
      }

      // Check if it's a valid Expo push token
      if (Expo.isExpoPushToken(pushToken)) {
        return { valid: true, type: 'expo', message: 'Valid Expo push token' };
      }

      // Could be a platform-specific token (APNs, FCM)
      const tokenString = String(pushToken);
      if (tokenString.startsWith('android') || tokenString.startsWith('ios')) {
        return { valid: true, type: 'platform', message: 'Valid platform-specific push token' };
      }

      return { valid: false, type: 'unknown', message: 'Unrecognized push token format' };
    } catch (error) {
      console.error('Error validating push token:', error);
      return { valid: false, type: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clean up invalid push tokens for users
   */
  async cleanupInvalidPushTokens(): Promise<number> {
    try {
      // Get all users with push tokens
      const query = `
        SELECT student_id, push_token FROM students
        WHERE push_token IS NOT NULL AND push_token != ''
      `;
      const result = await pool.query(query);
      
      let cleanedCount = 0;
      
      for (const row of result.rows) {
        const validation = await this.validatePushToken(row.push_token);
        if (!validation.valid) {
          // Clear invalid token
          await pool.query(
            'UPDATE students SET push_token = NULL WHERE student_id = $1',
            [row.student_id]
          );
          console.log(`🧹 Cleared invalid push token for user ${row.student_id}: ${validation.message}`);
          cleanedCount++;
        }
      }
      
      console.log(`✅ Cleaned up ${cleanedCount} invalid push tokens`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up invalid push tokens:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await pool.query(
        `DELETE FROM notifications
         WHERE created_at < $1 AND status IN ('read', 'failed')
         RETURNING id`,
        [cutoffDate]
      );
      
      const deletedCount = result.rowCount ?? 0;
      console.log(`🧹 Cleaned up ${deletedCount} old notifications (older than ${daysOld} days)`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, options: {
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
  async markAllAsRead(userId: string): Promise<any> {
    return NotificationModel.markAllAsRead(userId);
  }

  /**
   * Chunk array into smaller batches for concurrent processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Send broadcast notification to all users with push tokens
   * Uses concurrent processing with chunked batches for better performance
   */
  private broadcastNotificationLimiter = {
    lastBroadcast: 0,
    minIntervalMs: 60000, // 1 minute between broadcasts
  };

  private checkBroadcastRateLimit(): void {
    const now = Date.now();
    const timeSinceLastBroadcast = now - this.broadcastNotificationLimiter.lastBroadcast;
    
    if (timeSinceLastBroadcast < this.broadcastNotificationLimiter.minIntervalMs) {
      const waitSeconds = Math.ceil(
        (this.broadcastNotificationLimiter.minIntervalMs - timeSinceLastBroadcast) / 1000
      );
      throw new Error(
        `Broadcast notifications are rate limited. Please wait ${waitSeconds} seconds.`
      );
    }
    
    this.broadcastNotificationLimiter.lastBroadcast = now;
  }

  async sendBroadcastNotification(notificationData: {
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: 'low' | 'medium' | 'high';
    delivery_methods?: string[];
  }): Promise<{ success: number; failed: number; total: number }> {
    try {
      // Check rate limit
      this.checkBroadcastRateLimit();
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
      const CHUNK_SIZE = 10; // Process 10 notifications concurrently
      const chunks = this.chunkArray(users, CHUNK_SIZE);
      
      let successCount = 0;
      let failedCount = 0;

      // Process chunks concurrently
      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map(async (user) => {
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
            return { success: true, userId: user.student_id };
          })
        );

        // Count successes and failures
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failedCount++;
            const userId = result.status === 'fulfilled' ? result.value.userId : 'unknown';
            console.error(`Failed to send broadcast notification to user ${userId}`);
          }
        });
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
   * Uses concurrent processing with chunked batches for better performance
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
      const CHUNK_SIZE = 10; // Process 10 notifications concurrently
      const chunks = this.chunkArray(users, CHUNK_SIZE);
      
      let successCount = 0;
      let failedCount = 0;

      // Process chunks concurrently
      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map(async (user) => {
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
            return { success: true, userId: user.student_id };
          })
        );

        // Count successes and failures
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failedCount++;
            const userId = result.status === 'fulfilled' ? result.value.userId : 'unknown';
            console.error(`Failed to send school notification to user ${userId}`);
          }
        });
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

  /**
   * Create notification when a new found item is posted
   */
  async createFoundItemNotification(
    studentId: string,
    foundItemId: number,
    itemTitle: string
  ): Promise<any> {
    const title = 'New Found Item Posted';
    const message = `You have posted a new found item: ${itemTitle}`;

    const notificationData: CreateNotificationData = {
      user_id: studentId,
      type: 'found_item',
      title,
      message,
      data: {
        found_item_id: foundItemId,
        action: 'created'
      },
      priority: 'medium',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }

  /**
   * Create notification when a found item is claimed
   */
  async createFoundItemClaimedNotification(
    studentId: string,
    foundItemId: number,
    itemTitle: string
  ): Promise<any> {
    const title = 'Item Claimed';
    const message = `Your found item "${itemTitle}" has been marked as claimed`;

    const notificationData: CreateNotificationData = {
      user_id: studentId,
      type: 'found_item',
      title,
      message,
      data: {
        found_item_id: foundItemId,
        action: 'claimed'
      },
      priority: 'high',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }

  /**
   * Create notification when a found item is resolved
   */
  async createFoundItemResolvedNotification(
    studentId: string,
    foundItemId: number,
    itemTitle: string
  ): Promise<any> {
    const title = 'Item Resolved';
    const message = `Your found item "${itemTitle}" has been marked as resolved`;

    const notificationData: CreateNotificationData = {
      user_id: studentId,
      type: 'found_item',
      title,
      message,
      data: {
        found_item_id: foundItemId,
        action: 'resolved'
      },
      priority: 'high',
      delivery_methods: ['push']
    };

    return this.createAndSend(notificationData);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
