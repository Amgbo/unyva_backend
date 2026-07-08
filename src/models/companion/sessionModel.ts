import { pool } from '../../db.js';

export type SessionStatus = 'pending' | 'active' | 'completed';

export type Session = {
  id: string;
  booking_id: string;
  session_pin: string | null;
  started_by: string | null;
  confirmed_by: string | null;
  ended_by: string | null;
  started_at: string | null;
  confirmed_at: string | null;
  ended_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
};

export function generatePin(): string {
  // 6-digit PIN
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { rows } = await pool.query(`SELECT * FROM sessions WHERE id = $1;`, [id]);
  return rows[0] ?? null;
}

export async function getSessionByBookingId(bookingId: string): Promise<Session | null> {
  const { rows } = await pool.query(`SELECT * FROM sessions WHERE booking_id = $1;`, [bookingId]);
  return rows[0] ?? null;
}

export async function startSession(params: {
  booking_id: string;
  started_by: string;
}): Promise<{ session: Session; pin: string }> {
  const pin = generatePin();
  const { rows } = await pool.query(
    `
    UPDATE sessions
    SET
      session_pin = $1,
      started_by = $2,
      started_at = NOW(),
      status = 'pending',
      updated_at = NOW()
    WHERE booking_id = $3
    RETURNING *;
    `,
    [pin, params.started_by, params.booking_id]
  );

  // If no session row exists yet, create one.
  if (!rows[0]) {
    const { rows: createRows } = await pool.query(
      `
      INSERT INTO sessions (booking_id, session_pin, started_by, started_at, status)
      VALUES ($1,$2,$3,NOW(),'pending')
      RETURNING *;
      `,
      [params.booking_id, pin, params.started_by]
    );
    return { session: createRows[0] as Session, pin };
  }

  return { session: rows[0] as Session, pin };
}

export async function confirmSession(params: {
  sessionId: string;
  pin: string;
  confirmed_by: string;
}): Promise<Session | null> {
  const { sessionId, pin, confirmed_by } = params;

  const q = `
    UPDATE sessions
    SET
      confirmed_by = $1,
      confirmed_at = NOW(),
      status = 'active',
      updated_at = NOW()
    WHERE id = $2
      AND session_pin = $3
      AND status <> 'completed'
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [confirmed_by, sessionId, pin]);
  return rows[0] ?? null;
}

export async function endSession(params: {
  sessionId: string;
  ended_by: string;
}): Promise<Session | null> {
  const { sessionId, ended_by } = params;

  const q = `
    UPDATE sessions
    SET
      ended_by = $1,
      ended_at = NOW(),
      status = 'completed',
      updated_at = NOW()
    WHERE id = $2
      AND status <> 'completed'
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [ended_by, sessionId]);
  return rows[0] ?? null;
}

