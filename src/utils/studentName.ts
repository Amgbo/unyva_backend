import { pool } from '../db.js';

export async function getStudentDisplayName(
  studentId: string,
  fallback = 'Someone'
): Promise<string> {
  const { rows } = await pool.query(
    'SELECT first_name, last_name FROM students WHERE student_id = $1',
    [studentId]
  );
  const student = rows[0];
  const fullName = [student?.first_name, student?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || (studentId ? `@${studentId}` : fallback);
}
