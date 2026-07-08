import { pool } from '../db.js';

export interface DeleteAccountRequest {
  id: number;
  full_name: string;
  student_id_or_email: string;
  deletion_message: string;
  submitted_at: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export const createDeleteAccountRequest = async (
  fullName: string,
  studentIdOrEmail: string,
  deletionMessage: string
): Promise<DeleteAccountRequest> => {
  const query = `
    INSERT INTO delete_account_requests (full_name, student_id_or_email, deletion_message)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const values = [fullName, studentIdOrEmail, deletionMessage];
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getAllDeleteAccountRequests = async (): Promise<DeleteAccountRequest[]> => {
  const query = `
    SELECT * FROM delete_account_requests
    ORDER BY submitted_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

export const updateDeleteAccountRequestStatus = async (
  id: number,
  status: 'pending' | 'approved' | 'rejected'
): Promise<DeleteAccountRequest | null> => {
  const query = `
    UPDATE delete_account_requests
    SET status = $1
    WHERE id = $2
    RETURNING *
  `;
  const values = [status, id];
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

export const deleteDeleteAccountRequest = async (id: number): Promise<boolean> => {
  const query = 'DELETE FROM delete_account_requests WHERE id = $1';
  const result = await pool.query(query, [id]);
  return (result.rowCount ?? 0) > 0;
};
