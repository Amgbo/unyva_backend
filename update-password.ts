import { pool } from './src/db.js';
import bcrypt from 'bcrypt';

async function updatePassword() {
  try {
    const hashed = await bcrypt.hash('password123', 10);
    await pool.query('UPDATE students SET password = $1 WHERE student_id = $2', [hashed, 'TEST001']);
    console.log('✅ Password updated successfully');
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    await pool.end();
  }
}

updatePassword();
