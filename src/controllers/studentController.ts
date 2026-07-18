import { Request, Response } from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { handleControllerError } from '../utils/apiError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/students/register - Register a new student
export const registerStudent = async (req: Request, res: Response): Promise<void> => {

  try {
    const { student_id, first_name, last_name, email, password, phone, university_id, hall_id, room_number } = req.body;

    if (!student_id || !first_name || !last_name || !email || !password) {
      res.status(400).json({ error: 'Required fields missing' });
      return;
    }

    // Check if student already exists
    const existingResult = await pool.query(
      'SELECT student_id FROM students WHERE student_id = $1 OR email = $2',
      [student_id, email]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({ error: 'Student ID or email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO students (student_id, first_name, last_name, email, password, phone, university_id, hall_id, room_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING student_id, first_name, last_name, email, phone, university_id, hall_id, room_number, created_at`,
      [student_id, first_name, last_name, email, hashedPassword, phone || null, university_id || null, hall_id || null, room_number || null]
    );

    const token = jwt.sign(
      { student_id: result.rows[0].student_id, email: result.rows[0].email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: result.rows[0],
      token
    });
  } catch (err: any) {
    console.error('❌ Register Student Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to register student',
      context: 'student/registerStudent',
    });
  }
};

// POST /api/students/login - Login a student
export const loginStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, password } = req.body;

    if (!student_id || !password) {
      res.status(400).json({ error: 'Student ID and password are required' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [student_id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const student = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, student.password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { student_id: student.student_id, email: student.email, role: student.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    delete student.password;

    res.json({
      success: true,
      message: 'Login successful',
      student,
      token
    });
  } catch (err: any) {
    console.error('❌ Login Student Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to login',
      context: 'student/loginStudent',
    });
  }
};

// GET /api/students/profile - Get student profile
export const getProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.email, s.phone, s.profile_picture,
              s.university_id, s.hall_id, s.room_number, s.has_paid, s.payment_date,
              u.name as university_name, uh.full_name as hall_name
       FROM students s
       LEFT JOIN universities u ON s.university_id = u.id
       LEFT JOIN university_halls uh ON s.hall_id = uh.id
       WHERE s.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Profile Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch profile',
      context: 'student/getProfile',
    });
  }
};

// PUT /api/students/profile - Update student profile
export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { first_name, last_name, phone, profile_picture, university_id, hall_id, room_number } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (first_name !== undefined) { updates.push(`first_name = $${paramIndex++}`); values.push(first_name); }
    if (last_name !== undefined) { updates.push(`last_name = $${paramIndex++}`); values.push(last_name); }
    if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (profile_picture !== undefined) { updates.push(`profile_picture = $${paramIndex++}`); values.push(profile_picture); }
    if (university_id !== undefined) { updates.push(`university_id = $${paramIndex++}`); values.push(university_id); }
    if (hall_id !== undefined) { updates.push(`hall_id = $${paramIndex++}`); values.push(hall_id); }
    if (room_number !== undefined) { updates.push(`room_number = $${paramIndex++}`); values.push(room_number); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(studentId);

    const query = `UPDATE students SET ${updates.join(', ')} WHERE student_id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    delete result.rows[0].password;

    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Profile Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update profile',
      context: 'student/updateProfile',
    });
  }
};

// PUT /api/students/change-password - Change password
export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { current_password, new_password } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!current_password || !new_password) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    const result = await pool.query(
      'SELECT password FROM students WHERE student_id = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const isValidPassword = await bcrypt.compare(current_password, result.rows[0].password);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE students SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2',
      [hashedPassword, studentId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err: any) {
    console.error('❌ Change Password Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to change password',
      context: 'student/changePassword',
    });
  }
};

// GET /api/students/:studentId/public - Get public student info
export const getPublicStudentInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT student_id, first_name, last_name, profile_picture, university_id, hall_id,
              room_number, created_at
       FROM students
       WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      success: true,
      student: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Public Student Info Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch student info',
      context: 'student/getPublicStudentInfo',
    });
  }
};

// ---------------------------------------------------------------------------
// Legacy/backward-compatible exports required by src/routes/studentroutes.ts
// ---------------------------------------------------------------------------

// Step-1 registration legacy name
export const registerStep1 = registerStudent;

// Complete registration legacy name (best-effort: update profile using provided fields)
export const completeRegistration = updateProfile;

// Email verification legacy name (not present in this controller snapshot)
export const verifyEmail = async (_req: any, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'verifyEmail not implemented' });
};

// Login is already compatible
// export const loginStudent already exists and is imported directly by routes

// Profile legacy names
export const getStudentProfile = getProfile;
export const getStudentProfileById = getPublicStudentInfo;
export const updateStudentProfile = updateProfile;

// Delete account legacy name
export const deleteAccount = async (_req: any, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'deleteAccount not implemented' });
};
