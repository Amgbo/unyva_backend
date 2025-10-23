import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import {
  registerStep1Schema,
  registerStep2Schema,
} from '../validators/studentValidator.js';
import { deliveryCodeManager } from '../utils/DeliveryCodeManager.js';
import imagekit from '../config/imagekit.js';

// Email transporter (Gmail) - Initialize only if credentials are provided
let transporter: any = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('📧 Email transporter initialized');
  } catch (error) {
    console.log('⚠️ Email transporter initialization failed:', error);
    transporter = null;
  }
} else {
  console.log('⚠️ Email credentials not provided, email functionality disabled');
}

// STEP 1: Register Basic Info + Send Email Verification - UPDATED WITH HALL OF RESIDENCE
export const registerStep1 = async (req: Request, res: Response): Promise<void> => {
  console.log('🔵 REGISTER STEP 1 REQUEST RECEIVED');
  console.log('📦 Request body:', req.body);
  
  const parsed = registerStep1Schema.safeParse(req.body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.log('❌ Validation failed:', fieldErrors);

    const errorMessages = Object.entries(fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join(' | ');

    res.status(400).json({
      error: 'Validation failed',
      details: fieldErrors,
      message: errorMessages
    });
    return;
  }

  // Extract all fields including hall_of_residence and room_number
  const {
    student_id,
    email,
    first_name,
    last_name,
    phone,
    gender,
    date_of_birth,
    hall_of_residence,  // CHANGED: from address to hall_of_residence
    room_number = null, // NEW: Room number field
    role = 'buyer_seller',
    delivery_code = null,
    university = null,
    program = null,
    graduation_year = null,
  } = parsed.data;

  try {
    // Validate delivery code if role is 'delivery'
    if (role === 'delivery') {
      if (!delivery_code) {
        res.status(400).json({ error: 'Delivery access code is required for delivery role' });
        return;
      }

      const validationResult = await deliveryCodeManager.validateCode(delivery_code);
      if (!validationResult.isValid) {
        res.status(400).json({ error: validationResult.message });
        return;
      }
    }

    // Check if student already exists
    console.log('🔍 Checking if student exists...');
    const exists = await pool.query(
      'SELECT * FROM students WHERE email = $1 OR student_id = $2',
      [email, student_id]
    );

    if (exists.rows.length > 0) {
      console.log('⚠️ Student already exists with email:', email, 'or student_id:', student_id);
      res.status(409).json({
        error: 'Student with this email or student ID already exists.',
        existing_student: {
          email: exists.rows[0].email,
          student_id: exists.rows[0].student_id
        }
      });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Insert student with hall_of_residence and room_number
   // 🔧 ADD THIS DATE CONVERSION RIGHT BEFORE THE INSERT QUERY:
// Convert date from "DD-MM-YYYY" to "YYYY-MM-DD" for PostgreSQL
const [day, month, year] = date_of_birth.split('-');
const formattedDob = `${year}-${month}-${day}`;

console.log('📅 Original date:', date_of_birth);
console.log('📅 Formatted date for PostgreSQL:', formattedDob);

const insertResult = await pool.query(
  `INSERT INTO students
    (student_id, email, first_name, last_name, phone, gender, date_of_birth, 
     hall_of_residence, room_number, verification_token, is_verified, role, 
     delivery_code, is_delivery_approved, university, program, graduation_year)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
   RETURNING student_id, email, first_name, last_name, phone, role, university, program`,
  [
    student_id,
    email,
    first_name,
    last_name,
    phone,
    gender,
    formattedDob,  // ← USE THIS INSTEAD OF date_of_birth
    hall_of_residence,
    room_number,
    verificationToken,
    true,
    role,
    delivery_code,
    role === 'delivery',
    university,
    program,
    graduation_year
  ]
);

    console.log('✅ Student inserted successfully:', insertResult.rows[0]);

    // Mark delivery code as used if role is delivery
    if (role === 'delivery' && delivery_code) {
      await deliveryCodeManager.useCode(delivery_code, student_id);
      console.log('✅ Delivery code marked as used:', delivery_code);
    }

    // Try to send verification email, but don't fail if it doesn't work
    if (transporter) {
      try {
        const verifyLink = `${process.env.BASE_URL}/api/students/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
          from: `"Unyva UG" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Verify your Unyva account',
          html: `<p>Hello ${first_name},</p>
                 <p>Please click the link below to verify your email:</p>
                 <a href="${verifyLink}">${verifyLink}</a>`,
        });
        console.log('📧 Verification email sent to:', email);
      } catch (emailError: any) {
        console.log('⚠️ Email sending failed, but registration continues:', emailError?.message || 'Unknown error');
        // Continue with registration even if email fails
      }
    } else {
      console.log('⚠️ Email transporter not available, skipping email verification');
    }

    console.log('✅ REGISTRATION STEP 1 COMPLETED SUCCESSFULLY');
    console.log('👤 Student registered:', student_id);
    console.log('🎯 Role:', role);
    console.log('🏠 Hall of residence:', hall_of_residence);
    if (room_number) console.log('🚪 Room number:', room_number);
    if (role === 'delivery') {
      console.log('🚚 Delivery code used:', delivery_code);
    }

    // Return success response with role information
    res.status(201).json({
      success: true,
      student_id: student_id,
      message: 'Step 1 saved successfully. Proceed to Step 2.',
      student: {
        student_id: insertResult.rows[0].student_id,
        email: insertResult.rows[0].email,
        first_name: insertResult.rows[0].first_name,
        last_name: insertResult.rows[0].last_name,
        role: insertResult.rows[0].role,
        university: insertResult.rows[0].university,
        program: insertResult.rows[0].program
      }
    });
  } catch (err: any) {
    console.error('❌ Step 1 Database Error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      constraint: err.constraint
    });
    
    // Provide more specific error messages
    if (err.code === '23505') { // Unique violation
      res.status(409).json({
        error: 'Duplicate entry found',
        details: err.detail
      });
    } else if (err.code === '23502') { // Not null violation
      res.status(400).json({
        error: 'Missing required field',
        details: err.detail
      });
    } else if (err.code === '22P02') { // Invalid text representation
      res.status(400).json({
        error: 'Invalid data format',
        details: err.detail
      });
    } else {
      res.status(500).json({
        error: 'Step 1 registration failed',
        message: err.message,
        code: err.code
      });
    }
  }
};

// STEP 2: Upload Profile Picture + ID + Password - NO CHANGES NEEDED
export const registerStep2 = async (req: Request, res: Response): Promise<void> => {
  console.log('🔵 REGISTER STEP 2 REQUEST RECEIVED');
  console.log('📦 Request body:', req.body);
  console.log('🖼 Files received:', req.files ? Object.keys(req.files) : 'No files');
  
  if (req.files) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    console.log('📸 Profile picture:', files['profile_picture']?.[0]?.filename || 'Not received');
    console.log('🆔 ID card:', files['id_card']?.[0]?.filename || 'Not received');
  }

  const parsed = registerStep2Schema.safeParse(req.body);

  if (!parsed.success) {
    console.log('❌ Validation failed:', parsed.error.flatten().fieldErrors);
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    console.log('❌ Passwords do not match');
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  const profilePicFile = files?.['profile_picture']?.[0];
  const idCardFile = files?.['id_card']?.[0];

  // For testing purposes, make files optional
  if (!profilePicFile || !idCardFile) {
    console.log('⚠️ No files provided - this is allowed for testing');
  }

  const student_id = req.body.student_id;
  if (!student_id) {
    console.log('❌ Missing student ID');
    res.status(400).json({ error: 'Missing student ID in form data.' });
    return;
  }

  try {
    console.log('🔐 Hashing password for student:', student_id);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload profile picture and ID card to ImageKit if provided
    let profilePictureUrl = null;
    let idCardUrl = null;

    if (profilePicFile) {
      const profileResult = await imagekit.upload({
        file: profilePicFile.buffer,
        fileName: `${student_id}-profile-${Date.now()}.jpg`,
        folder: "/unyva_profiles",
      });
      profilePictureUrl = profileResult.url;
      console.log('📸 Profile picture uploaded to ImageKit:', profilePictureUrl);
    }

    if (idCardFile) {
      const idCardResult = await imagekit.upload({
        file: idCardFile.buffer,
        fileName: `${student_id}-idcard-${Date.now()}.jpg`,
        folder: "/unyva_idcards",
      });
      idCardUrl = idCardResult.url;
      console.log('🆔 ID card uploaded to ImageKit:', idCardUrl);
    }

    console.log('💾 Updating student record in database...');
    const result = await pool.query(
      `UPDATE students
       SET password = $1, profile_picture = $2, id_card = $3, registration_complete = TRUE
       WHERE student_id = $4
       RETURNING *`,
      [
        hashedPassword,
        profilePictureUrl,
        idCardUrl,
        student_id,
      ]
    );

    if (result.rows.length === 0) {
      console.log('❌ Student not found in database:', student_id);
      res.status(404).json({ error: 'Student not found. Please complete step 1 first.' });
      return;
    }

    console.log('✅ REGISTRATION STEP 2 COMPLETED SUCCESSFULLY');
    console.log('👤 Student ID:', student_id);
    console.log('📸 Profile picture saved:', profilePicFile?.filename || 'No file uploaded');
    console.log('🆔 ID card saved:', idCardFile?.filename || 'No file uploaded');
    
    res.status(200).json({
      message: 'Registration completed successfully!',
      student: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Step 2 Error:', err);
    res.status(500).json({ error: 'Step 2 registration failed' });
  }
};

// VERIFY EMAIL - NO CHANGES NEEDED
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invalid verification token' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE students 
       SET is_verified = TRUE, verification_token = NULL 
       WHERE verification_token = $1 
       RETURNING *`,
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (err) {
    console.error('❌ Email Verification Error:', err);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

// LOGIN - UPDATED TO INCLUDE ROLE IN RESPONSE
export const loginStudent = async (req: Request, res: Response): Promise<void> => {
  const { student_id, password } = req.body;

  console.log('🔐 Login attempt for student_id:', student_id);

  if (!student_id || !password) {
    res.status(400).json({ error: 'Student ID and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [student_id]
    );

    const student = result.rows[0];

    console.log('📋 Student found:', student ? 'Yes' : 'No');
    if (student) {
      console.log('📋 Student has password:', !!student.password);
      console.log('📋 Student is verified:', student.is_verified);
      console.log('🎯 Student role:', student.role || 'buyer_seller');
    }

    if (!student) {
      res.status(401).json({ error: 'Invalid student ID or password' });
      return;
    }

    const match = await bcrypt.compare(password, student.password);
    console.log('🔑 Password match:', match);
    if (!match) {
      res.status(401).json({ error: 'Invalid student ID or password' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    console.log('🔑 Using JWT secret:', jwtSecret ? 'Set' : 'Not set');

    // Include role in JWT token
    const token = jwt.sign(
      {
        student_id: student.student_id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        role: student.role || 'buyer_seller',
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Return role information in response
    res.status(200).json({
      message: 'Login successful',
      token,
      student: {
        student_id: student.student_id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        phone: student.phone,
        gender: student.gender,
        date_of_birth: student.date_of_birth,
        hall_of_residence: student.hall_of_residence,
        room_number: student.room_number,
        profile_picture: student.profile_picture,
        role: student.role || 'buyer_seller',
        is_delivery_approved: student.is_delivery_approved,
        university: student.university,
        program: student.program,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// GET: Logged-in student's profile - UPDATED TO INCLUDE NEW FIELDS
export const getStudentProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const studentIdFromToken = req.user?.student_id;

    if (!studentIdFromToken) {
      res.status(401).json({ error: 'Unauthorized: No student ID found in token' });
      return;
    }

    // Include all fields in profile response
    const result = await pool.query(
      `SELECT student_id, email, first_name, last_name, phone, gender,
              date_of_birth, hall_of_residence, room_number, profile_picture, role,
              is_delivery_approved, university, program, graduation_year
       FROM students WHERE student_id = $1`,
      [studentIdFromToken]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json({ student: result.rows[0] });
  } catch (err) {
    console.error('❌ Get Profile Error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// GET: Student profile by ID - UPDATED TO INCLUDE NEW FIELDS
export const getStudentProfileById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    // Include all fields in profile response
    const result = await pool.query(
      `SELECT student_id, email, first_name, last_name, phone, gender,
              date_of_birth, hall_of_residence, room_number, profile_picture, role,
              is_delivery_approved, university, program, graduation_year
       FROM students WHERE student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.status(200).json({ student: result.rows[0] });
  } catch (err) {
    console.error('❌ Get Profile By ID Error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// UPDATE: Student profile - UPDATED TO HANDLE FORM DATA PROPERLY
export const updateStudentProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const studentIdFromToken = req.user?.student_id;

    if (!studentIdFromToken) {
      res.status(401).json({ error: 'Unauthorized: No student ID found in token' });
      return;
    }

    console.log('🔄 UPDATE PROFILE REQUEST RECEIVED');
    console.log('📦 req.method:', req.method);
    console.log('📦 req.url:', req.url);
    console.log('📦 req.body:', req.body);
    console.log('🖼 req.files:', req.files ? req.files.length : 'No files');
    console.log('🔑 req.headers.content-type:', req.headers['content-type']);
    console.log('🔑 req.headers.authorization:', req.headers['authorization'] ? 'Present' : 'Missing');

    // Handle both regular body data and form data
    const { first_name, last_name, phone, gender, hall_of_residence, room_number } = req.body;

    console.log('📝 Extracted fields:', { first_name, last_name, phone, gender, hall_of_residence, room_number });
    console.log('🔍 Field types:', {
      first_name: typeof first_name,
      last_name: typeof last_name,
      phone: typeof phone,
      gender: typeof gender,
      hall_of_residence: typeof hall_of_residence,
      room_number: typeof room_number
    });

    // Handle profile picture upload - with upload.any(), files are in req.files
    let profilePictureUrl = null;
    if (req.files && req.files.length > 0) {
      console.log('📁 Files found:', req.files.length);
      req.files.forEach((file: Express.Multer.File, index: number) => {
        console.log(`📁 File ${index}: fieldname=${file.fieldname}, filename=${file.filename}, size=${file.size}`);
      });
      const profilePicFile = req.files.find((file: Express.Multer.File) => file.fieldname === 'profile_picture');
      if (profilePicFile) {
        // Upload to ImageKit
        const profileResult = await imagekit.upload({
          file: profilePicFile.buffer,
          fileName: `${studentIdFromToken}-profile-${Date.now()}.jpg`,
          folder: "/unyva_profiles",
        });
        profilePictureUrl = profileResult.url;
        console.log('📸 Profile picture uploaded to ImageKit:', profilePictureUrl);
      } else {
        console.log('⚠️ No profile_picture file found in req.files');
      }
    } else {
      console.log('⚠️ No files in req.files');
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (first_name !== undefined && first_name !== '') {
      if (Array.isArray(first_name)) {
        console.log('⚠️ Warning: first_name is an array, using first element:', first_name[0]);
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(first_name[0]);
      } else {
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(first_name);
      }
    }
    if (last_name !== undefined && last_name !== '') {
      if (Array.isArray(last_name)) {
        console.log('⚠️ Warning: last_name is an array, using first element:', last_name[0]);
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(last_name[0]);
      } else {
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(last_name);
      }
    }
    if (phone !== undefined && phone !== '') {
      if (Array.isArray(phone)) {
        console.log('⚠️ Warning: phone is an array, using first element:', phone[0]);
        updateFields.push(`phone = $${paramIndex++}`);
        values.push(phone[0]);
      } else {
        updateFields.push(`phone = $${paramIndex++}`);
        values.push(phone);
      }
    }
    if (gender !== undefined && gender !== '') {
      if (Array.isArray(gender)) {
        console.log('⚠️ Warning: gender is an array, using first element:', gender[0]);
        updateFields.push(`gender = $${paramIndex++}`);
        values.push(gender[0]);
      } else {
        updateFields.push(`gender = $${paramIndex++}`);
        values.push(gender);
      }
    }
    if (hall_of_residence !== undefined && hall_of_residence !== '') {
      if (Array.isArray(hall_of_residence)) {
        console.log('⚠️ Warning: hall_of_residence is an array, using first element:', hall_of_residence[0]);
        updateFields.push(`hall_of_residence = $${paramIndex++}`);
        values.push(hall_of_residence[0]);
      } else {
        updateFields.push(`hall_of_residence = $${paramIndex++}`);
        values.push(hall_of_residence);
      }
    }
    if (room_number !== undefined && room_number !== '') {
      if (Array.isArray(room_number)) {
        console.log('⚠️ Warning: room_number is an array, using first element:', room_number[0]);
        updateFields.push(`room_number = $${paramIndex++}`);
        values.push(room_number[0]);
      } else {
        updateFields.push(`room_number = $${paramIndex++}`);
        values.push(room_number);
      }
    }
    if (profilePictureUrl !== null) {
      updateFields.push(`profile_picture = $${paramIndex++}`);
      values.push(profilePictureUrl);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: 'No fields to update', reqBody: req.body });
      return;
    }



    // Add student_id at the end
    values.push(studentIdFromToken);

    const query = `
      UPDATE students
      SET ${updateFields.join(', ')}
      WHERE student_id = $${paramIndex}
      RETURNING student_id, email, first_name, last_name, phone, gender,
                date_of_birth, hall_of_residence, room_number, profile_picture, role,
                is_delivery_approved, university, program, graduation_year
    `;

    console.log('📝 Final update query:', query);
    console.log('📝 Query values:', values);

    try {
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      res.status(200).json({
        message: 'Profile updated successfully',
        student: result.rows[0]
      });
    } catch (queryError: any) {
      console.error('❌ Database query error:', queryError);
      res.status(500).json({
        error: 'Database query failed',
        message: queryError.message,
        code: queryError.code,
        detail: queryError.detail
      });
    }
  } catch (err: any) {
    console.error('❌ Update Profile Error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      constraint: err.constraint,
      stack: err.stack
    });
    res.status(500).json({
      error: 'Failed to update profile',
      message: err.message,
      code: err.code,
      detail: err.detail
    });
  }
};
