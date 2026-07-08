// productMessageModel.ts
import { pool } from '../db.js';

export interface ProductMessage {
  id: number;
  product_id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface ProductMessageWithNames extends ProductMessage {
  sender_name: string;
  receiver_name: string;
}

export interface CreateMessageData {
  product_id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
}

// Get all messages for a specific product between buyer and seller
export const getMessagesForProduct = async (productId: number): Promise<ProductMessageWithNames[]> => {
  try {
    const query = `
      SELECT
        pm.*,
        CONCAT(s.first_name, ' ', s.last_name) as sender_name,
        CONCAT(r.first_name, ' ', r.last_name) as receiver_name
      FROM product_messages pm
      JOIN students s ON pm.sender_id = s.student_id
      JOIN students r ON pm.receiver_id = r.student_id
      WHERE pm.product_id = $1
      ORDER BY pm.created_at ASC
    `;

    const result = await pool.query(query, [productId]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getMessagesForProduct:', error);
    throw error;
  }
};

// Create a new message
export const createMessage = async (messageData: CreateMessageData): Promise<ProductMessage> => {
  try {
    const { product_id, sender_id, receiver_id, message } = messageData;

    const query = `
      INSERT INTO product_messages (product_id, sender_id, receiver_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [product_id, sender_id, receiver_id, message];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createMessage:', error);
    throw error;
  }
};

// Get product owner (seller) by product ID
export const getProductOwner = async (productId: number): Promise<string | null> => {
  try {
    const query = `
      SELECT student_id
      FROM products
      WHERE id = $1
    `;

    const result = await pool.query(query, [productId]);
    if (result.rows.length === 0) return null;

    return result.rows[0].student_id;
  } catch (error) {
    console.error('Database error in getProductOwner:', error);
    throw error;
  }
};

// Get the last buyer who sent a message for a product (for seller replies)
export const getLastBuyerForProduct = async (productId: number, sellerId: string): Promise<string | null> => {
  try {
    const query = `
      SELECT sender_id
      FROM product_messages
      WHERE product_id = $1 AND sender_id != $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [productId, sellerId]);
    return result.rows.length > 0 ? result.rows[0].sender_id : null;
  } catch (error) {
    console.error('Database error in getLastBuyerForProduct:', error);
    throw error;
  }
};

// Get unread message count for a user (across all products)
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM product_messages
      WHERE receiver_id = $1 AND is_read = false
    `;

    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].unread_count, 10);
  } catch (error) {
    console.error('Database error in getUnreadMessageCount:', error);
    throw error;
  }
};

// Mark messages as read for a specific product and user
export const markMessagesAsRead = async (productId: number, userId: string): Promise<void> => {
  try {
    const query = `
      UPDATE product_messages
      SET is_read = true
      WHERE product_id = $1 AND receiver_id = $2 AND is_read = false
    `;

    await pool.query(query, [productId, userId]);
  } catch (error) {
    console.error('Database error in markMessagesAsRead:', error);
    throw error;
  }
};

// Get inbox items for seller (products with messages)
export const getSellerInbox = async (sellerId: string): Promise<any[]> => {
  try {
    const query = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (product_id)
          product_id,
          message,
          created_at
        FROM product_messages
        WHERE product_id IN (SELECT id FROM products WHERE student_id = $1)
        ORDER BY product_id, created_at DESC
      ),
      unread_counts AS (
        SELECT
          product_id,
          COUNT(*) as unread_count
        FROM product_messages
        WHERE receiver_id = $1 AND is_read = false
        GROUP BY product_id
      )
      SELECT
        p.id as product_id,
        p.title as product_title,
        pi.image_url as product_image,
        lm.message as last_message,
        lm.created_at as last_message_time,
        COALESCE(uc.unread_count, 0) as unread_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      JOIN latest_messages lm ON p.id = lm.product_id
      LEFT JOIN unread_counts uc ON p.id = uc.product_id
      WHERE p.student_id = $1
      ORDER BY lm.created_at DESC
    `;

    const result = await pool.query(query, [sellerId]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getSellerInbox:', error);
    throw error;
  }
};
