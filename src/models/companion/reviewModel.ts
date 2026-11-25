import { pool } from '../../db.js';

export type Review = {
  id: string;
  session_id: string;
  reviewer_id: string;
  guide_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export async function submitReview(params: {
  session_id: string;
  reviewer_id: string;
  guide_id: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  const { session_id, reviewer_id, guide_id, rating, comment } = params;

  const q = `
    INSERT INTO reviews (session_id, reviewer_id, guide_id, rating, comment)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [session_id, reviewer_id, guide_id, rating, comment ?? null]);
  return rows[0] as Review;
}

/**
 * Insert a review tied to a booking. `reviews.session_id` is required and unique,
 * so the booking's session row is reused or created (marked completed) in the
 * same transaction. Returns null if this booking has already been reviewed.
 */
export async function submitReviewForBooking(params: {
  booking_id: string;
  reviewer_id: string;
  guide_id: string;
  rating: number;
  comment?: string | null;
}): Promise<Review | null> {
  const { booking_id, reviewer_id, guide_id, rating, comment } = params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: sessionRows } = await client.query(
      `INSERT INTO sessions (booking_id, ended_by, ended_at, status)
       VALUES ($1, $2, NOW(), 'completed')
       ON CONFLICT (booking_id) DO UPDATE SET updated_at = sessions.updated_at
       RETURNING id;`,
      [booking_id, reviewer_id]
    );
    const sessionId = sessionRows[0].id;

    const { rows } = await client.query(
      `INSERT INTO reviews (session_id, reviewer_id, guide_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (session_id) DO NOTHING
       RETURNING *;`,
      [sessionId, reviewer_id, guide_id, rating, comment ?? null]
    );

    await client.query('COMMIT');
    return (rows[0] as Review) ?? null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getReviewsForGuides(guideIds: string[]): Promise<Review[]> {
  if (guideIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT * FROM reviews WHERE guide_id = ANY($1::uuid[]) ORDER BY created_at DESC;`,
    [guideIds]
  );
  return rows as Review[];
}

export async function getReviewsForGuide(guideId: string): Promise<Review[]> {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM reviews
    WHERE guide_id = $1
    ORDER BY created_at DESC;
    `,
    [guideId]
  );
  return rows as Review[];
}

