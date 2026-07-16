import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/universities - Get all universities
export const getUniversities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, name, country, city, logo_url FROM universities ORDER BY name ASC'
    );

    res.status(200).json({
      success: true,
      universities: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Universities Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch universities',
      context: 'university/getUniversities',
    });
  }
};

// GET /api/universities/:id - Get university by ID
export const getUniversityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, name, country, city, logo_url FROM universities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'University not found' });
      return;
    }

    res.status(200).json({
      success: true,
      university: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get University By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch university',
      context: 'university/getUniversityById',
    });
  }
};

// GET /api/universities/:id/halls - Get halls for a university
export const getUniversityHalls = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, full_name, short_name, latitude, longitude
       FROM university_halls
       WHERE university_id = $1
       ORDER BY full_name ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      halls: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get University Halls Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch university halls',
      context: 'university/getUniversityHalls',
    });
  }
};

// POST /api/universities - Add new university (Admin only)
export const addUniversity = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { name, country, city, logo_url } = req.body;

    if (studentId !== '22243185') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'University name is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO universities (name, country, city, logo_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, country || null, city || null, logo_url || null]
    );

    res.status(201).json({
      success: true,
      university: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add University Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add university',
      context: 'university/addUniversity',
    });
  }
};

// POST /api/universities/:id/halls - Add hall to university (Admin only)
export const addUniversityHall = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const { full_name, short_name, latitude, longitude } = req.body;

    if (studentId !== '22243185') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    if (!full_name) {
      res.status(400).json({ error: 'Hall name is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO university_halls (university_id, full_name, short_name, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, full_name, short_name || null, latitude || null, longitude || null]
    );

    res.status(201).json({
      success: true,
      hall: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add University Hall Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add university hall',
      context: 'university/addUniversityHall',
    });
  }
};
