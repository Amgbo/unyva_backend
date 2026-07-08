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

