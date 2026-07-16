import { Request, Response } from 'express';
import { pool } from '../db.js';
import { deliveryCodeManager } from '../utils/DeliveryCodeManager.js';
import { notificationService } from '../services/notificationService.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/deliveries/verify-code/:code - Verify a delivery code
export const verifyDeliveryCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    console.log('🔍 Verifying delivery code:', code);

    if (!code || code.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Delivery code is required'
      });
      return;
    }

    const result = await deliveryCodeManager.validateCode(code.trim());

    if (!result.isValid) {
      res.status(400).json({
        success: false,
        error: result.message || 'Invalid delivery code'
      });
      return;
    }

    console.log('✅ Delivery code verified successfully');
    res.status(200).json({
      success: true,
      message: result.message || 'Delivery code verified successfully'
    });
  } catch (err: any) {
    console.error('❌ Verify Delivery Code Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to verify delivery code',
      context: 'delivery/verifyDeliveryCode',
    });
  }
};

// POST /api/deliveries/register - Register as a delivery user
export const registerDeliveryUser = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { delivery_code, vehicle_type, phone, location } = req.body;

    console.log('🚚 Registering delivery user:', studentId);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!delivery_code) {
      res.status(400).json({
        success: false,
        error: 'Delivery code is required'
      });
      return;
    }

    // Verify the delivery code
    const codeResult = await deliveryCodeManager.validateCode(delivery_code.trim());

    if (!codeResult.isValid) {
      res.status(400).json({
        success: false,
        error: codeResult.message || 'Invalid delivery code'
      });
      return;
    }

    // Check if already registered
    const existingResult = await pool.query(
      'SELECT id FROM delivery_users WHERE student_id = $1',
      [studentId]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'You are already registered as a delivery user'
      });
      return;
    }

    // Insert delivery user
    const result = await pool.query(
      `INSERT INTO delivery_users (student_id, vehicle_type, phone, location, is_active, rating, total_deliveries)
       VALUES ($1, $2, $3, $4, true, 0, 0)
       RETURNING *`,
      [studentId, vehicle_type || null, phone || null, location || null]
    );

    // Mark delivery code as used
    await deliveryCodeManager.useCode(delivery_code.trim(), studentId);

    console.log('✅ Delivery user registered successfully');
    res.status(201).json({
      success: true,
      message: 'Delivery user registered successfully',
      delivery_user: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Register Delivery User Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to register delivery user',
      context: 'delivery/registerDeliveryUser',
    });
  }
};

// GET /api/deliveries/profile - Get delivery user profile
export const getDeliveryProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const result = await pool.query(
      `SELECT du.*, s.first_name, s.last_name, s.email, s.phone as student_phone
       FROM delivery_users du
       JOIN students s ON du.student_id = s.student_id
       WHERE du.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Delivery profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      profile: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Delivery Profile Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch delivery profile',
      context: 'delivery/getDeliveryProfile',
    });
  }
};

// PUT /api/deliveries/profile - Update delivery user profile
export const updateDeliveryProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { vehicle_type, phone, location, is_active } = req.body;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check if delivery user exists
    const existingResult = await pool.query(
      'SELECT id FROM delivery_users WHERE student_id = $1',
      [studentId]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Delivery profile not found'
      });
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (vehicle_type !== undefined) {
      updates.push(`vehicle_type = $${paramIndex++}`);
      values.push(vehicle_type);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
      return;
    }

    values.push(studentId);

    const query = `
      UPDATE delivery_users 
      SET ${updates.join(', ')}
      WHERE student_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: 'Delivery profile updated successfully',
      profile: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Delivery Profile Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update delivery profile',
      context: 'delivery/updateDeliveryProfile',
    });
  }
};

// GET /api/deliveries/available - Get available delivery requests
export const getAvailableDeliveries = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check if user is an active delivery user
    const deliveryUserResult = await pool.query(
      'SELECT id FROM delivery_users WHERE student_id = $1 AND is_active = true',
      [studentId]
    );

    if (deliveryUserResult.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: 'You must be an active delivery user to view available deliveries'
      });
      return;
    }

    const result = await pool.query(
      `SELECT d.*, o.total_amount, o.status as order_status,
              s.first_name as student_first_name, s.last_name as student_last_name,
              s.phone as student_phone
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN students s ON o.student_id = s.student_id
       WHERE d.status = 'pending'
       ORDER BY d.created_at DESC`
    );

    res.status(200).json({
      success: true,
      deliveries: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Available Deliveries Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch available deliveries',
      context: 'delivery/getAvailableDeliveries',
    });
  }
};

// POST /api/deliveries/:id/accept - Accept a delivery request
export const acceptDelivery = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check if user is an active delivery user
    const deliveryUserResult = await pool.query(
      'SELECT id FROM delivery_users WHERE student_id = $1 AND is_active = true',
      [studentId]
    );

    if (deliveryUserResult.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: 'You must be an active delivery user to accept deliveries'
      });
      return;
    }

    // Check if delivery exists and is pending
    const deliveryResult = await pool.query(
      'SELECT * FROM deliveries WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (deliveryResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Delivery not found or already accepted'
      });
      return;
    }

    const delivery = deliveryResult.rows[0];

    // Update delivery status
    await pool.query(
      `UPDATE deliveries 
       SET status = 'accepted', delivery_user_id = $1, accepted_at = NOW()
       WHERE id = $2`,
      [studentId, id]
    );

    // Update order status
    await pool.query(
      `UPDATE orders SET status = 'out_for_delivery' WHERE id = $1`,
      [delivery.order_id]
    );

    // Notify the customer
    try {
      const orderResult = await pool.query(
        'SELECT student_id FROM orders WHERE id = $1',
        [delivery.order_id]
      );

      if (orderResult.rows.length > 0) {
        await notificationService.createOrderStatusNotification(
          orderResult.rows[0].student_id,
          delivery.order_id,
          'out_for_delivery'
        );
      }
    } catch (notifyError) {
      console.warn('Failed to send delivery acceptance notification:', notifyError);
    }

    res.status(200).json({
      success: true,
      message: 'Delivery accepted successfully'
    });
  } catch (err: any) {
    console.error('❌ Accept Delivery Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to accept delivery',
      context: 'delivery/acceptDelivery',
    });
  }
};

// POST /api/deliveries/:id/complete - Mark delivery as completed
export const completeDelivery = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check if delivery exists and belongs to this delivery user
    const deliveryResult = await pool.query(
      'SELECT * FROM deliveries WHERE id = $1 AND delivery_user_id = $2 AND status = $3',
      [id, studentId, 'accepted']
    );

    if (deliveryResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Delivery not found or not assigned to you'
      });
      return;
    }

    const delivery = deliveryResult.rows[0];

    // Update delivery status
    await pool.query(
      `UPDATE deliveries 
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Update order status
    await pool.query(
      `UPDATE orders SET status = 'delivered' WHERE id = $1`,
      [delivery.order_id]
    );

    // Update delivery user stats
    await pool.query(
      `UPDATE delivery_users 
       SET total_deliveries = total_deliveries + 1
       WHERE student_id = $1`,
      [studentId]
    );

    // Notify the customer
    try {
      const orderResult = await pool.query(
        'SELECT student_id FROM orders WHERE id = $1',
        [delivery.order_id]
      );

      if (orderResult.rows.length > 0) {
        await notificationService.createOrderStatusNotification(
          orderResult.rows[0].student_id,
          delivery.order_id,
          'delivered'
        );
      }
    } catch (notifyError) {
      console.warn('Failed to send delivery completion notification:', notifyError);
    }

    res.status(200).json({
      success: true,
      message: 'Delivery completed successfully'
    });
  } catch (err: any) {
    console.error('❌ Complete Delivery Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to complete delivery',
      context: 'delivery/completeDelivery',
    });
  }
};

// GET /api/deliveries/my-deliveries - Get delivery user's assigned deliveries
export const getMyDeliveries = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const result = await pool.query(
      `SELECT d.*, o.total_amount, o.status as order_status,
              s.first_name as student_first_name, s.last_name as student_last_name,
              s.phone as student_phone
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       JOIN students s ON o.student_id = s.student_id
       WHERE d.delivery_user_id = $1
       ORDER BY d.created_at DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      deliveries: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get My Deliveries Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch your deliveries',
      context: 'delivery/getMyDeliveries',
    });
  }
};
