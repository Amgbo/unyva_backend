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

export async function getBookingById(id: string): Promise<any | null> {
  const { rows } = await pool.query(
    `SELECT 
      b.*,
      g.student_id AS guide_student_id,
      sf.first_name AS freshman_first_name,
      sf.last_name AS freshman_last_name,
      sf.profile_picture AS freshman_profile_picture,
      sg.first_name AS guide_first_name,
      sg.last_name AS guide_last_name,
      sg.profile_picture AS guide_profile_picture
    FROM bookings b
    LEFT JOIN guides g ON b.guide_id = g.id
    LEFT JOIN students sf ON b.freshman_id = sf.student_id
    LEFT JOIN students sg ON g.student_id = sg.student_id
    WHERE b.id = $1;`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getBookingsByFreshmanId(freshmanId: string): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT 
      b.*,
      g.student_id AS guide_student_id,
      sg.first_name AS guide_first_name,
      sg.last_name AS guide_last_name,
      sg.profile_picture AS guide_profile_picture
    FROM bookings b
    LEFT JOIN guides g ON b.guide_id = g.id
    LEFT JOIN students sg ON g.student_id = sg.student_id
    WHERE b.freshman_id = $1
    ORDER BY b.created_at DESC;`,
    [freshmanId]
  );
  return rows;
}

export async function getBookingsByGuideId(guideId: string): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT 
      b.*,
      g.student_id AS guide_student_id,
      sf.first_name AS freshman_first_name,
      sf.last_name AS freshman_last_name,
      sf.profile_picture AS freshman_profile_picture
    FROM bookings b
    LEFT JOIN guides g ON b.guide_id = g.id
    LEFT JOIN students sf ON b.freshman_id = sf.student_id
    WHERE b.guide_id = $1
    ORDER BY b.created_at DESC;`,
    [guideId]
  );
  return rows;
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

export async function deleteBooking(params: {
  bookingId: string;
  freshmanId: string;
}): Promise<Booking | null> {
  await pool.query('DELETE FROM companion_messages WHERE booking_id = $1', [params.bookingId]);

  const { rows } = await pool.query(
    `DELETE FROM bookings
     WHERE id = $1 AND freshman_id = $2
     RETURNING *;`,
    [params.bookingId, params.freshmanId]
  );
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

export async function updateBookingDetails(params: {
  bookingId: string;
  help_category?: string;
  preferred_date?: string;
  preferred_time?: string;
  message?: string | null;
}): Promise<any | null> {
  const { bookingId, help_category, preferred_date, preferred_time, message } = params;

  const updates: string[] = [];
  const values: any[] = [];

  if (help_category !== undefined) {
    values.push(help_category);
    updates.push(`help_category = $${values.length}`);
  }
  if (preferred_date !== undefined) {
    values.push(preferred_date);
    updates.push(`preferred_date = $${values.length}`);
  }
  if (preferred_time !== undefined) {
    values.push(preferred_time);
    updates.push(`preferred_time = $${values.length}`);
  }
  if (message !== undefined) {
    values.push(message);
    updates.push(`message = $${values.length}`);
  }

  if (updates.length === 0) {
    return getBookingById(bookingId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(bookingId);
  const q = `
    UPDATE bookings
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id;
  `;

  const { rows } = await pool.query(q, values);
  if (rows.length === 0) return null;
  return getBookingById(bookingId);
}
