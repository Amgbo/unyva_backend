import { pool } from './src/db.js';

async function testStudentRegistration() {
  try {
    console.log('🧪 Testing student registration...');

    // Test data similar to what would be sent from the frontend
    const testStudent = {
      student_id: 'TEST123456',
      first_name: 'Test',
      last_name: 'Student',
      email: 'test.student@university.edu',
      phone: '+1234567890',
      password: 'hashed_password_here',
      university: 'University of Ghana',
      program: 'Computer Science',
      graduation_year: 2024,
      hall_of_residence: 'Commonwealth Hall'
    };

    // Test the INSERT query that was failing
    const insertQuery = `
      INSERT INTO students (
        student_id, first_name, last_name, email, phone, password,
        university, program, graduation_year, hall_of_residence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING student_id, first_name, last_name, email
    `;

    const result = await pool.query(insertQuery, [
      testStudent.student_id,
      testStudent.first_name,
      testStudent.last_name,
      testStudent.email,
      testStudent.phone,
      testStudent.password,
      testStudent.university,
      testStudent.program,
      testStudent.graduation_year,
      testStudent.hall_of_residence
    ]);

    console.log('✅ Student registration test successful!');
    console.log('📝 Created student:', result.rows[0]);

    // Clean up - remove the test student
    await pool.query('DELETE FROM students WHERE student_id = $1', [testStudent.student_id]);
    console.log('🧹 Test student cleaned up');

  } catch (error) {
    console.error('❌ Student registration test failed:', error);
  } finally {
    await pool.end();
  }
}

testStudentRegistration();
