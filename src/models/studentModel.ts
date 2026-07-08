import { pool } from '../db.js';

export interface StudentStep1 {
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  hall_of_residence: string;
  room_number: string;
  role: string;
  university: string;
  program: string;
  graduation_year?: number;
  delivery_code?: string;
  has_paid?: boolean;
  payment_date?: string;
}

// Save Step 1 registration data
export const createStudentStep1 = async (student: StudentStep1) => {
  const {
    student_id,
    email,
    first_name,
    last_name,
    phone,
    gender,
    date_of_birth,
    hall_of_residence,
    room_number,
    role,
    university,
    program,
    graduation_year,
    delivery_code,
  } = student;

  const query = `
    INSERT INTO students
    (student_id, email, first_name, last_name, phone, gender, date_of_birth, 
     hall_of_residence, room_number, role, university, program, graduation_year, delivery_code)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  const values = [
    student_id,
    email,
    first_name,
    last_name,
    phone,
    gender,
    date_of_birth,
    hall_of_residence,
    room_number,
    role,
    university,
    program,
    graduation_year,
    delivery_code,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Save Step 2 data: password + images
export const updateStudentStep2 = async (
  student_id: string,
  password: string,
  profile_picture: string,
  id_card: string
) => {
  const query = `
    UPDATE students
    SET password = $1,
        profile_picture = $2,
        id_card = $3
    WHERE student_id = $4
    RETURNING *;
  `;

  const values = [password, profile_picture, id_card, student_id];

  const result = await pool.query(query, values);
  return result.rows[0];
};