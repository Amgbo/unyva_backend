import { Response } from 'express';
import { pool } from '../db.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

/**
 * Delivery Controller - Handles delivery person operations
 */

// Middleware to ensure user is a delivery person
const requireDeliveryRole = (req: AuthRequest, res: Response, next: any): void => {
  console.log('requireDeliveryRole called, req.user:', req.user);
  if (req.user?.role !== 'delivery') {
    console.log('Access denied: user role is', req.user?.role);
    res.status(403).json({ error: 'Access denied. Delivery role required.' });
    return;
  }
  console.log('Delivery role check passed');
  // Note: Removed is_delivery_approved check for now to allow testing
  // TODO: Add back approval check once admin approval system is implemented
  next();
};

/**
 * Get delivery stats for the authenticated delivery person
 */
export const getDeliveryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = String(req.user!.student_id);

    // Total deliveries
    const totalDeliveriesResult = await pool.query(
      `SELECT COUNT(*) as total FROM deliveries WHERE delivery_person_id = $1`,
      [studentId]
    );

    // Completed deliveries
    const completedDeliveriesResult = await pool.query(
      `SELECT COUNT(*) as completed FROM deliveries 
       WHERE delivery_person_id = $1 AND status = 'completed'`,
      [studentId]
    );

    // Pending deliveries
    const pendingDeliveriesResult = await pool.query(
      `SELECT COUNT(*) as pending FROM deliveries 
       WHERE delivery_person_id = $1 AND status IN ('pending', 'assigned', 'in_progress')`,
      [studentId]
    );

    // Average rating
    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as average_rating FROM deliveries 
       WHERE delivery_person_id = $1 AND rating IS NOT NULL`,
      [studentId]
    );

    // Total earnings (sum of delivery fees for completed deliveries)
    const totalEarningsResult = await pool.query(
      `SELECT COALESCE(SUM(delivery_fee), 0) as total_earnings FROM deliveries 
       WHERE delivery_person_id = $1 AND status = 'completed'`,
      [studentId]
    );

    const stats = {
      total_deliveries: parseInt(totalDeliveriesResult.rows[0].total),
      completed_deliveries: parseInt(completedDeliveriesResult.rows[0].completed),
      pending_deliveries: parseInt(pendingDeliveriesResult.rows[0].pending),
      average_rating: parseFloat(avgRatingResult.rows[0].average_rating) || 0,
      total_earnings: parseFloat(totalEarningsResult.rows[0].total_earnings),
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({ error: 'Failed to fetch delivery stats' });
  }
};

/**
 * Get list of deliveries for the delivery person
 */
export const getDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = String(req.user!.student_id);
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT d.*, 
             s1.first_name as customer_first_name, s1.last_name as customer_last_name,
             s2.first_name as seller_first_name, s2.last_name as seller_last_name,
             uh1.full_name as pickup_hall, uh2.full_name as delivery_hall
      FROM deliveries d
      LEFT JOIN students s1 ON d.customer_id = s1.student_id
      LEFT JOIN students s2 ON d.seller_id = s2.student_id  -- Assuming seller_id if exists, else adjust
      LEFT JOIN university_halls uh1 ON d.pickup_hall_id = uh1.id
      LEFT JOIN university_halls uh2 ON d.delivery_hall_id = uh2.id
      WHERE d.delivery_person_id = $1
    `;
    const params: (string | number)[] = [studentId];

    if (status) {
      query += ` AND d.status = $${params.length + 1}`;
      params.push(status as string);
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), offset);

    const deliveriesResult = await pool.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total FROM deliveries 
      WHERE delivery_person_id = $1${status ? ` AND status = $${params.length}` : ''}
    `;
    const countParams = [studentId, ...(status ? [status] : [])];
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      deliveries: deliveriesResult.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
};

/**
 * Start a delivery (change status from assigned to in_progress)
 */
export const acceptDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = String(req.user!.student_id);
    const deliveryId = parseInt(req.params.id);

    if (isNaN(deliveryId)) {
      res.status(400).json({ error: 'Invalid delivery ID' });
      return;
    }

    // Check if delivery person has unfinished delivery
    const unfinishedDeliveryCheck = await pool.query(
      `SELECT COUNT(*) as count FROM deliveries 
       WHERE delivery_person_id = $1 AND status IN ('assigned', 'in_progress')`,
      [studentId]
    );

    if (parseInt(unfinishedDeliveryCheck.rows[0].count) > 0) {
      res.status(400).json({ error: 'You have an unfinished delivery. Complete it before accepting a new one.' });
      return;
    }

    // Attempt to assign delivery to delivery person if not already assigned
    const assignResult = await pool.query(
      `UPDATE deliveries
       SET delivery_person_id = $1, status = 'assigned', assigned_at = NOW()
       WHERE id = $2 AND (delivery_person_id IS NULL OR delivery_person_id = $1) AND status = 'pending'`,
      [studentId, deliveryId]
    );

    if (assignResult.rowCount === 0) {
      res.status(404).json({ error: 'Delivery not found, already assigned, or not available for acceptance' });
      return;
    }

    // Update order status to 'assigned' when delivery is assigned
    await pool.query(
      `UPDATE orders
       SET status = 'assigned', updated_at = NOW()
       WHERE id = (SELECT order_id FROM deliveries WHERE id = $1)`,
      [deliveryId]
    );

    // Start the delivery (change status from assigned to in_progress)
    const startResult = await pool.query(
      `UPDATE deliveries
       SET status = 'in_progress', started_at = NOW()
       WHERE id = $1 AND delivery_person_id = $2 AND status = 'assigned'`,
      [deliveryId, studentId]
    );

    if (startResult.rowCount === 0) {
      res.status(500).json({ error: 'Failed to start delivery after assignment' });
      return;
    }

    // Update order status to 'in_progress' when delivery starts
    await pool.query(
      `UPDATE orders
       SET status = 'in_progress', updated_at = NOW()
       WHERE id = (SELECT order_id FROM deliveries WHERE id = $1)`,
      [deliveryId]
    );

    res.json({ success: true, message: 'Delivery accepted and started successfully' });
  } catch (error) {
    console.error('Error starting delivery:', error);
    res.status(500).json({ error: 'Failed to start delivery' });
  }
};

/**
 * Complete a delivery
 */
export const completeDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('completeDelivery called with deliveryId:', req.params.id, 'user:', req.user);
  try {
    const studentId = String(req.user!.student_id);
    const deliveryId = parseInt(req.params.id, 10);
    const { rating, review } = req.body as { rating?: number; review?: string };
    console.log('Parsed deliveryId:', deliveryId, 'studentId:', studentId, 'rating:', rating, 'review:', review);

    if (isNaN(deliveryId)) {
      res.status(400).json({ error: 'Invalid delivery ID' });
      return;
    }

    // Validate rating range (1-5) if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    // Update delivery status
    let updateDeliveryQuery = `UPDATE deliveries SET status = 'completed', completed_at = NOW()`;
    let params: any[] = [deliveryId, studentId];

    if (rating !== undefined) {
      updateDeliveryQuery += `, rating = $${params.length + 1}`;
      params.push(rating);
    }
    if (review) {
      const reviewIndex = params.length + 1;
      updateDeliveryQuery += `, review = $${reviewIndex}`;
      params.push(review);
    }

    updateDeliveryQuery += ` WHERE id = $1 AND delivery_person_id = $2 AND status IN ('assigned', 'in_progress')`;

    console.log('Executing updateDeliveryQuery:', updateDeliveryQuery);
    console.log('With params:', params);

    const result = await pool.query(updateDeliveryQuery, params);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Delivery not found or already completed' });
      return;
    }

    // Update order status to 'delivered' and payment_status to 'paid' when delivery is completed
    await pool.query(
      `UPDATE orders
       SET status = 'delivered', payment_status = 'paid', updated_at = NOW()
       WHERE id = (SELECT order_id FROM deliveries WHERE id = $1)`,
      [deliveryId]
    );

    // Update delivery person's rating if rating provided
    if (rating !== undefined) {
      console.log('Updating rating for studentId:', studentId, 'with rating:', rating);
      await pool.query(
        `UPDATE students
         SET delivery_rating = (
           SELECT AVG(rating::decimal) FROM deliveries WHERE delivery_person_id = $1 AND rating IS NOT NULL
         ),
         delivery_review_count = (
           SELECT COUNT(*) FROM deliveries WHERE delivery_person_id = $1 AND rating IS NOT NULL
         )
         WHERE student_id = $1`,
        [studentId]
      );
    }

    res.json({ success: true, message: 'Delivery completed successfully' });
  } catch (error) {
    console.error('Error completing delivery:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      detail: (error as any)?.detail
    });
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
};

/**
 * Get pending deliveries for the authenticated delivery person
 */
export const getPendingDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = String(req.user!.student_id);

    const result = await pool.query(
      `SELECT d.*,
             s.first_name as customer_first_name, s.last_name as customer_last_name,
             uh1.full_name as pickup_hall, uh2.full_name as delivery_hall
       FROM deliveries d
       LEFT JOIN students s ON d.customer_id = s.student_id
       LEFT JOIN university_halls uh1 ON d.pickup_hall_id = uh1.id
       LEFT JOIN university_halls uh2 ON d.delivery_hall_id = uh2.id
       WHERE d.delivery_person_id = $1 AND d.status IN ('pending', 'assigned', 'in_progress')
       ORDER BY d.created_at DESC
       LIMIT 20`,
      [studentId]
    );

    res.json({ success: true, pending_deliveries: result.rows });
  } catch (error) {
    console.error('Error fetching pending deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch pending deliveries' });
  }
};

/**
 * Get available deliveries (unassigned pending deliveries) for delivery persons
 */
export const getAvailableDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = String(req.user!.student_id);

    // Check if delivery person has unfinished delivery
    const unfinishedDeliveryCheck = await pool.query(
      `SELECT COUNT(*) as count FROM deliveries 
       WHERE delivery_person_id = $1 AND status IN ('assigned', 'in_progress')`,
      [studentId]
    );

    if (parseInt(unfinishedDeliveryCheck.rows[0].count) > 0) {
      res.json({ success: true, available_deliveries: [], has_unfinished_delivery: true });
      return;
    }

    const result = await pool.query(
      `SELECT d.*,
             s.first_name as customer_first_name, s.last_name as customer_last_name,
             uh1.full_name as pickup_hall, uh2.full_name as delivery_hall
       FROM deliveries d
       LEFT JOIN students s ON d.customer_id = s.student_id
       LEFT JOIN university_halls uh1 ON d.pickup_hall_id = uh1.id
       LEFT JOIN university_halls uh2 ON d.delivery_hall_id = uh2.id
       WHERE d.delivery_person_id IS NULL AND d.status = 'pending'
       ORDER BY d.created_at DESC
       LIMIT 20`,
      []
    );

    res.json({ success: true, available_deliveries: result.rows, has_unfinished_delivery: false });
  } catch (error) {
    console.error('Error fetching available deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch available deliveries' });
  }
};

// Export middleware
export { requireDeliveryRole };
