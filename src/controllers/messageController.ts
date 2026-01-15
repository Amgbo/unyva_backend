// src/controllers/messageController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import {
  getMessagesForProduct,
  createMessage,
  getProductOwner,
  getLastBuyerForProduct,
  getSellerInbox,
  markMessagesAsRead,
  CreateMessageData
} from '../models/productMessageModel.js';
import { notificationService } from '../services/notificationService.js';

// POST /api/messages/product - Send a message for a product
export const sendProductMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user?.id; // This should be the numeric id from students table
    const { product_id, message } = req.body;

    if (!senderId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No user ID found in token'
      });
      return;
    }

    // Validate input
    if (!product_id || !message || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Product ID and non-empty message are required'
      });
      return;
    }

    // Get product owner (seller)
    const sellerId = await getProductOwner(product_id);
    if (!sellerId) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    let receiverId: string;

    if (senderId === sellerId) {
      // Sender is seller, find last buyer who messaged
      const lastBuyerId = await getLastBuyerForProduct(product_id, sellerId);
      if (!lastBuyerId) {
        res.status(400).json({
          success: false,
          error: 'No buyer has messaged this product yet'
        });
        return;
      }
      receiverId = lastBuyerId;
    } else {
      // Sender is buyer, receiver is seller
      receiverId = sellerId;
    }

    // Create message
    const messageData: CreateMessageData = {
      product_id: parseInt(product_id, 10),
      sender_id: senderId,
      receiver_id: receiverId,
      message: message.trim()
    };

    const newMessage = await createMessage(messageData);

    // Send notification to receiver (seller when buyer messages, or buyer when seller responds)
    try {
      // Get sender info and receiver student_id for notification
      const userQuery = `
        SELECT
          s.student_id as sender_student_id,
          s.first_name,
          s.last_name,
          s.profile_picture,
          s.hall_of_residence,
          s.room_number,
          s.program,
          p.title as product_title,
          r.student_id as receiver_student_id
        FROM students s
        CROSS JOIN products p
        CROSS JOIN students r
        WHERE s.student_id = $1 AND p.id = $2 AND r.student_id = $3
      `;
      const userResult = await pool.query(userQuery, [senderId, product_id, receiverId]);

      if (userResult.rows.length > 0) {
        const { sender_student_id, first_name, last_name, product_title, receiver_student_id } = userResult.rows[0];
        const senderName = `${first_name} ${last_name}`;

        // Determine notification type and message
        let notificationTitle: string;
        let notificationMessage: string;
        let notificationType: string;

        if (senderId === sellerId) {
          // Seller responding to buyer
          notificationTitle = 'Seller Response';
          notificationMessage = `${senderName} responded to your inquiry about "${product_title}"`;
          notificationType = 'message';
        } else {
          // Buyer messaging seller
          notificationTitle = 'New Product Inquiry';
          notificationMessage = `${senderName} sent you a message about "${product_title}"`;
          notificationType = 'message';
        }

        // Send notification to receiver using their student_id
        await notificationService.createAndSend({
          user_id: parseInt(receiver_student_id, 10), // Convert student_id string to number for notification
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            product_id: parseInt(product_id, 10),
            sender_id: senderId,
            message_id: newMessage.id,
            product_title: product_title,
            sender_profile: {
              id: userResult.rows[0].sender_student_id,
              first_name: userResult.rows[0].first_name,
              last_name: userResult.rows[0].last_name,
              profile_picture: userResult.rows[0].profile_picture,
              hall_of_residence: userResult.rows[0].hall_of_residence,
              room_number: userResult.rows[0].room_number,
              program: userResult.rows[0].program
            }
          },
          priority: 'medium',
          delivery_methods: ['push']
        });

        console.log(`📤 Notification sent to receiver ${receiver_student_id} for message about product ${product_id}`);
      }
    } catch (notificationError) {
      console.error('❌ Error sending message notification:', notificationError);
      // Don't fail the message sending if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/messages/product/:productId - Get messages for a product
export const getProductMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No user ID found in token'
      });
      return;
    }

    const productIdNum = parseInt(productId, 10);
    if (isNaN(productIdNum)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    // Verify user has access to this product's messages (is buyer or seller)
    const productOwner = await getProductOwner(productIdNum);
    if (!productOwner) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    // Check if user is the seller or has messaged this product, or is trying to message for the first time
    const accessQuery = `
      SELECT 1 FROM products p
      LEFT JOIN product_messages pm ON p.id = pm.product_id
      WHERE p.id = $1 AND (p.student_id = $2
        OR pm.sender_id = $2 OR pm.receiver_id = $2
        OR p.student_id != $2)  -- Allow any authenticated user to start messaging any product they don't own
      LIMIT 1
    `;
    const accessResult = await pool.query(accessQuery, [productIdNum, userId]);

    if (accessResult.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You cannot message your own product'
      });
      return;
    }

    // Mark messages as read for this user
    await markMessagesAsRead(productIdNum, userId);

    // Get messages
    const messages = await getMessagesForProduct(productIdNum);

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/messages/inbox - Get seller's inbox
export const getSellerInboxController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No user ID found in token'
      });
      return;
    }

    const inbox = await getSellerInbox(userId);

    res.status(200).json({
      success: true,
      count: inbox.length,
      inbox
    });
  } catch (error) {
    console.error('❌ Error fetching inbox:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inbox',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/messages/mark-read/:productId - Mark messages as read for a product
export const markMessagesAsReadController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No user ID found in token'
      });
      return;
    }

    const productIdNum = parseInt(productId, 10);
    if (isNaN(productIdNum)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    // Mark messages as read using the imported function
    await markMessagesAsRead(productIdNum, userId);

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
