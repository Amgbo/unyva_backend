import { pool } from './src/db.js';

async function checkStudents() {
  try {
    const result = await pool.query('SELECT student_id, first_name, last_name FROM students LIMIT 5');
    console.log('Available students:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.student_id}, Name: ${row.first_name} ${row.last_name}`);
    });
    pool.end();
  } catch (err) {
    console.error('Error:', err);
    pool.end();
  }
}

checkStudents();
