import { pool } from '../db.js';

export interface Notification {
  id?: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  delivery_methods?: string[];
  scheduled_at?: Date;
  sent_at?: Date;
  read_at?: Date;
  retry_count?: number;
  max_retries?: number;
  error_message?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateNotificationData {
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
  delivery_methods?: string[];
  scheduled_at?: Date;
}

export class NotificationModel {
  static async create(notificationData: CreateNotificationData): Promise<Notification> {
    const {
      user_id,
      type,
      title,
      message,
      data = {},
      priority = 'medium',
      delivery_methods = ['push'],
      scheduled_at
    } = notificationData;

    const query = `
      INSERT INTO notifications (
        user_id, type, title, message, data, priority,
        delivery_methods, scheduled_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      user_id,
      type,
      title,
      message,
      JSON.stringify(data),
      priority,
      delivery_methods,
      scheduled_at,
      scheduled_at ? 'pending' : 'pending'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId: number, options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    const { status, type, limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    const query = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM notifications
      ${whereClause.replace('WHERE user_id = $1', 'WHERE user_id = $1')}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    return {
      notifications: result.rows,
      total
    };
  }

  static async updateStatus(id: number, status: string, additionalData: {
    sent_at?: Date;
    read_at?: Date;
    error_message?: string;
    retry_count?: number;
  } = {}): Promise<Notification | null> {
    const updateFields: string[] = ['status = $2'];
    const values: any[] = [id, status];
    let paramIndex = 3;

    if (additionalData.sent_at) {
      updateFields.push(`sent_at = $${paramIndex}`);
      values.push(additionalData.sent_at);
      paramIndex++;
    }

    if (additionalData.read_at) {
      updateFields.push(`read_at = $${paramIndex}`);
      values.push(additionalData.read_at);
      paramIndex++;
    }

    if (additionalData.error_message) {
      updateFields.push(`error_message = $${paramIndex}`);
      values.push(additionalData.error_message);
      paramIndex++;
    }

    if (additionalData.retry_count !== undefined) {
      updateFields.push(`retry_count = $${paramIndex}`);
      values.push(additionalData.retry_count);
      paramIndex++;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE notifications
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async markAsRead(id: number): Promise<Notification | null> {
    return this.updateStatus(id, 'read', { read_at: new Date() });
  }

  static async markAllAsRead(userId: number): Promise<number> {
    const query = `
      UPDATE notifications
      SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND status != 'read'
      RETURNING id
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount ?? 0;
  }

  static async getPendingNotifications(): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications
      WHERE status = 'pending'
      AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)
      ORDER BY priority DESC, created_at ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async incrementRetryCount(id: number): Promise<Notification | null> {
    const query = `
      UPDATE notifications
      SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async findAll(options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    const { status, type, limit = 50, offset = 0 } = options;

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (status || type) {
      whereClause = 'WHERE';
      const conditions: string[] = [];

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (type) {
        conditions.push(`type = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      whereClause += ' ' + conditions.join(' AND ');
    }

    const query = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM notifications
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    return {
      notifications: result.rows,
      total
    };
  }

  static async getStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM notifications
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      pending: parseInt(stats.pending),
      sent: parseInt(stats.sent),
      delivered: parseInt(stats.delivered),
      read: parseInt(stats.read),
      failed: parseInt(stats.failed)
    };
  }
}
