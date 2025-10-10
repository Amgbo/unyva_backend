import { pool } from './src/db.js';
import bcrypt from 'bcrypt';

async function testPassword() {
  try {
    const result = await pool.query('SELECT password FROM students WHERE student_id = $1', ['TEST001']);
    const hashedPassword = result.rows[0]?.password;

    if (!hashedPassword) {
      console.log('No password found');
      return;
    }

    const testPassword = 'password123';
    const match = await bcrypt.compare(testPassword, hashedPassword);
    console.log('Password match:', match);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testPassword();
