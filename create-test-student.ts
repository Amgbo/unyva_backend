import { pool } from './src/db.js';
import bcrypt from 'bcrypt';

async function createTestStudent() {
  try {
    console.log('🧪 Creating test student for cart testing...');

    const testStudent = {
      student_id: 'TEST001',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '+1234567890',
      password: 'password123',
      university: 'University of Ghana',
      program: 'Computer Science',
      graduation_year: 2024,
      hall_of_residence: 'Commonwealth Hall'
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(testStudent.password, 10);

    // Check if student already exists
    const existing = await pool.query('SELECT * FROM students WHERE student_id = $1', [testStudent.student_id]);

    if (existing.rows.length > 0) {
      console.log('✅ Test student already exists');
      return;
    }

    // Insert test student
    await pool.query(`
      INSERT INTO students (
        student_id, first_name, last_name, email, phone, password,
        university, program, graduation_year, hall_of_residence,
        is_verified, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      testStudent.student_id,
      testStudent.first_name,
      testStudent.last_name,
      testStudent.email,
      testStudent.phone,
      hashedPassword,
      testStudent.university,
      testStudent.program,
      testStudent.graduation_year,
      testStudent.hall_of_residence,
      true, // is_verified
      'buyer_seller'
    ]);

    console.log('✅ Test student created successfully!');
    console.log('👤 Student ID: TEST001');
    console.log('🔑 Password: password123');

  } catch (error) {
    console.error('❌ Failed to create test student:', error);
  } finally {
    await pool.end();
  }
}

createTestStudent();
