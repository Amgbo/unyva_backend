import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/services - Get all services
export const getServices = async (req: Request, res: Response): Promise<void> => {

  try {
    const { category, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT s.*, st.first_name, st.last_name, st.profile_picture
      FROM services s
      JOIN students st ON s.student_id = st.student_id
      WHERE s.is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND s.category = $${paramIndex++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND (s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      services: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Services Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch services',
      context: 'service/getServices',
    });
  }
};

// GET /api/services/:id - Get service by ID
export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*, st.first_name, st.last_name, st.profile_picture
       FROM services s
       JOIN students st ON s.student_id = st.student_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    res.status(200).json({
      success: true,
      service: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Service By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch service',
      context: 'service/getServiceById',
    });
  }
};

// POST /api/services - Create new service
export const createService = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { title, description, category, price, price_type } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!title || !description || !category) {
      res.status(400).json({ error: 'Title, description, and category are required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO services (student_id, title, description, category, price, price_type, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [studentId, title, description, category, price || null, price_type || 'fixed']
    );

    res.status(201).json({
      success: true,
      service: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Create Service Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to create service',
      context: 'service/createService',
    });
  }
};

// PUT /api/services/:id - Update service
export const updateService = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const { title, description, category, price, price_type, is_active } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const serviceResult = await pool.query(
      'SELECT student_id FROM services WHERE id = $1',
      [id]
    );

    if (serviceResult.rows.length === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    if (serviceResult.rows[0].student_id !== studentId) {
      res.status(403).json({ error: 'You can only update your own services' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }
    if (price !== undefined) { updates.push(`price = $${paramIndex++}`); values.push(price); }
    if (price_type !== undefined) { updates.push(`price_type = $${paramIndex++}`); values.push(price_type); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE services SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      service: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Service Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update service',
      context: 'service/updateService',
    });
  }
};

// DELETE /api/services/:id - Delete service
export const deleteService = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const serviceResult = await pool.query(
      'SELECT student_id FROM services WHERE id = $1',
      [id]
    );

    if (serviceResult.rows.length === 0) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    if (serviceResult.rows[0].student_id !== studentId) {
      res.status(403).json({ error: 'You can only delete your own services' });
      return;
    }

    await pool.query('DELETE FROM services WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Service Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete service',
      context: 'service/deleteService',
    });
  }
};

// GET /api/services/my/services - Get current user's services
export const getMyServices = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT s.*, st.first_name, st.last_name
       FROM services s
       JOIN students st ON s.student_id = st.student_id
       WHERE s.student_id = $1
       ORDER BY s.created_at DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      services: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get My Services Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch your services',
      context: 'service/getMyServices',
    });
  }
};

// ---------------------------------------------------------------------------
// Legacy/backward-compatible exports required by src/routes/serviceRoutes.ts
// ---------------------------------------------------------------------------

export const getService = getServiceById;
export const createNewService = createService;
export const updateExistingService = updateService;
export const deleteExistingService = deleteService;

export const getFeaturedServicesController = getServices;

// The following endpoints are referenced by routes but are not implemented
// in this controller snapshot. Provide best-effort stubs so TypeScript can
// compile without changing route files.

const notImplemented = (publicError: string) => {
  return (req: any, res: Response): Promise<void> => {
    res.status(501).json({ success: false, error: publicError });
    return Promise.resolve();
  };
};

export const getServiceReviewsController = notImplemented('Service reviews not implemented');
export const getProviderStatsController = notImplemented('Provider stats not implemented');
export const createBookingController = notImplemented('Service booking not implemented');
export const getProviderBookingsController = notImplemented('Provider bookings not implemented');
export const getBuyerBookingsController = notImplemented('Buyer bookings not implemented');
export const updateBookingStatusController = notImplemented('Booking status update not implemented');

export const getNotificationsController = notImplemented('Notifications not implemented');
export const markNotificationReadController = notImplemented('Mark notification read not implemented');

export const createReviewController = notImplemented('Service review creation not implemented');
export const deleteServiceReviewController = notImplemented('Service review deletion not implemented');
export const canUserReviewServiceController = notImplemented('Service review permission check not implemented');
export const getUserReviewForServiceController = notImplemented('Get service review not implemented');
