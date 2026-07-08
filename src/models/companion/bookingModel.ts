import { pool } from '../../db.js';

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  freshman_id: string;
  guide_id: string;
  help_category: string;
  preferred_date: string;
  preferred_time: string;
  message: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

export async function createBooking(params: {
  freshman_id: string;
  guide_id: string;
  help_category: string;
  preferred_date: string; // YYYY-MM-DD
  preferred_time: string; // HH:mm:ss
  message?: string | null;
}): Promise<Booking> {
  const { freshman_id, guide_id, help_category, preferred_date, preferred_time, message } = params;

  const q = `
    INSERT INTO bookings (
      freshman_id, guide_id, help_category, preferred_date, preferred_time, message
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [
    freshman_id,
    guide_id,
    help_category,
    preferred_date,
    preferred_time,
    message ?? null,
  ]);

  return rows[0] as Booking;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const { rows } = await pool.query(`SELECT * FROM bookings WHERE id = $1;`, [id]);
  return rows[0] ?? null;
}

export async function getBookingsByFreshmanId(freshmanId: string): Promise<Booking[]> {
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE freshman_id = $1 ORDER BY created_at DESC;`,
    [freshmanId]
  );
  return rows as Booking[];
}

export async function getBookingsByGuideId(guideId: string): Promise<Booking[]> {
  const { rows } = await pool.query(
    `SELECT * FROM bookings WHERE guide_id = $1 ORDER BY created_at DESC;`,
    [guideId]
  );
  return rows as Booking[];
}

export async function setBookingStatus(params: {
  bookingId: string;
  status: BookingStatus;
  guideId?: string;
  freshmanId?: string;
}): Promise<Booking | null> {
  const { bookingId, status, guideId, freshmanId } = params;

  const where: string[] = [`id = $${1}`];
  const values: any[] = [bookingId];

  if (guideId) {
    values.push(guideId);
    where.push(`guide_id = $${values.length}`);
  }

  if (freshmanId) {
    values.push(freshmanId);
    where.push(`freshman_id = $${values.length}`);
  }

  values.unshift(status);
  // Now values[0] is status; bookingId will be at index 2.
  // But we need proper placeholders; rebuild query for safety.

  const statusPlaceholder = '$1';
  const restValues = [status, ...values.slice(1)];

  // where currently uses $1 for id, but now $1 is status. Rebuild where with correct indexes.
  // Simpler: build query without reuse of old where placeholders.

  const conditions: string[] = [];
  const finalValues: any[] = [];

  finalValues.push(bookingId);
  conditions.push(`id = $${finalValues.length}`);

  if (guideId) {
    finalValues.push(guideId);
    conditions.push(`guide_id = $${finalValues.length}`);
  }
  if (freshmanId) {
    finalValues.push(freshmanId);
    conditions.push(`freshman_id = $${finalValues.length}`);
  }

  // status is separate
  const q = `
    UPDATE bookings
    SET status = $${conditions.length + 1},
        updated_at = NOW()
    WHERE ${conditions.join(' AND ')}
    RETURNING *;
  `;

  const statusValueIndex = conditions.length + 1;
  const finalParams = [...finalValues, status];

  const { rows } = await pool.query(q, finalParams);
  return rows[0] ?? null;
}

export async function updateBookingForCompletion(params: {
  bookingId: string;
  completedBy: string; // not stored but used for auth/logic
}): Promise<Booking | null> {
  const { bookingId } = params;
  const { rows } = await pool.query(
    `
    UPDATE bookings
    SET status = 'completed', updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [bookingId]
  );
  return rows[0] ?? null;
}

