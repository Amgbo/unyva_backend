import { pool } from '../../db.js';

export type Guide = {
  id: string;
  student_id: string;
  department: string | null;
  college: string | null;
  hall: string | null;
  year: number | null;
  bio: string | null;
  areas_of_expertise: string[] | null;
  availability_status: 'available' | 'in_class' | 'at_dorm';
  rating: number;
  completed_sessions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Enriched from the student's registration/profile record
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  profile_picture?: string | null;
  program?: string | null;
  university?: string | null;
  hall_of_residence?: string | null;
};

export type GuideFilters = {
  department?: string;
  availability_status?: 'available' | 'in_class' | 'at_dorm';
  minRating?: number;
  onlyActive?: boolean;
  q?: string;
  hall?: string;
};

export async function createGuide(params: {
  student_id: string;
  department?: string;
  college?: string;
  hall?: string;
  year?: number;
  bio?: string;
  areas_of_expertise?: string[];
}): Promise<Guide> {
  const { student_id, department, college, hall, year, bio, areas_of_expertise } = params;

  // Validate the student exists before creating a guide record.
  const studentCheck = await pool.query('SELECT student_id FROM students WHERE student_id = $1', [student_id]);
  if (studentCheck.rows.length === 0) {
    throw new Error('Student account not found');
  }

  // Allow multiple guides per student. The unique key is now (student_id, department).
  const q = `
    INSERT INTO guides (
      student_id,
      department,
      college,
      hall,
      year,
      bio,
      areas_of_expertise,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    ON CONFLICT (student_id, department)
    DO UPDATE SET
      college = EXCLUDED.college,
      hall = EXCLUDED.hall,
      year = EXCLUDED.year,
      bio = EXCLUDED.bio,
      areas_of_expertise = EXCLUDED.areas_of_expertise,
      is_active = true,
      updated_at = NOW()
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [
    student_id,
    department ?? null,
    college ?? null,
    hall ?? null,
    year ?? null,
    bio ?? null,
    areas_of_expertise ?? [],
  ]);

  return rows[0] as Guide;
}

export async function getAllGuides(filters: GuideFilters): Promise<Guide[]> {
  const where: string[] = ['g.is_active = true'];
  const values: any[] = [];

  if (filters.department) {
    values.push(filters.department);
    where.push(`g.department ILIKE $${values.length}`);
  }

  if (filters.availability_status) {
    values.push(filters.availability_status);
    where.push(`g.availability_status = $${values.length}`);
  }

  if (filters.minRating !== undefined) {
    values.push(filters.minRating);
    where.push(`g.rating >= $${values.length}`);
  }

  if (filters.hall) {
    values.push(`%${filters.hall}%`);
    where.push(`(g.hall ILIKE $${values.length} OR s.hall_of_residence ILIKE $${values.length})`);
  }

  if (filters.q) {
    const term = `%${filters.q}%`;
    values.push(term);
    const idx = values.length;
    where.push(`(
      s.first_name ILIKE $${idx}
      OR s.last_name ILIKE $${idx}
      OR s.student_id::text ILIKE $${idx}
      OR g.department ILIKE $${idx}
      OR g.bio ILIKE $${idx}
      OR EXISTS (
        SELECT 1 FROM UNNEST(g.areas_of_expertise) area
        WHERE area ILIKE $${idx}
      )
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const q = `
    SELECT
      g.*,
      s.first_name,
      s.last_name,
      s.email,
      s.profile_picture,
      s.program,
      s.university,
      s.hall_of_residence
    FROM guides g
    LEFT JOIN students s ON s.student_id = g.student_id
    ${whereSql}
    ORDER BY g.rating DESC, g.completed_sessions DESC, g.created_at DESC
    ;
  `;

  const { rows } = await pool.query(q, values);
  return rows.map(enrichGuide) as Guide[];
}

const GUIDE_WITH_STUDENT_SELECT = `
  g.*,
  s.first_name,
  s.last_name,
  s.email,
  s.profile_picture,
  s.program,
  s.university,
  s.hall_of_residence
`;

function resolveProfilePictureUrl(profilePicture: string | null | undefined): string | null {
  if (!profilePicture) return null;
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture;
  }
  if (profilePicture.startsWith('/uploads/')) return profilePicture;
  if (profilePicture.startsWith('uploads/')) return `/${profilePicture}`;
  return `/uploads/profiles/${profilePicture}`;
}

function enrichGuide(row: any): Guide {
  if (!row) return row;
  return {
    ...row,
    profile_picture: resolveProfilePictureUrl(row.profile_picture),
  };
}

export async function getGuideById(guideId: string): Promise<Guide | null> {
  // guideId may be the numeric primary key (uuid) or the student_id.
  // Try by id first; if that fails or the id is not a valid uuid, look up by student_id.
  try {
    const { rows } = await pool.query(
      `SELECT ${GUIDE_WITH_STUDENT_SELECT}
       FROM guides g
       LEFT JOIN students s ON s.student_id = g.student_id
       WHERE g.id = $1;`,
      [guideId]
    );
    if (rows[0]) return enrichGuide(rows[0]);
  } catch (error: any) {
    // If Postgres complains about invalid uuid syntax, fall through to student_id lookup.
    if (!error.message?.includes('invalid input syntax for type uuid')) {
      throw error;
    }
  }

  const { rows } = await pool.query(
    `SELECT ${GUIDE_WITH_STUDENT_SELECT}
     FROM guides g
     LEFT JOIN students s ON s.student_id = g.student_id
     WHERE g.student_id = $1;`,
    [guideId]
  );
  return enrichGuide(rows[0]) ?? null;
}

export async function getGuideByStudentId(student_id: string): Promise<Guide | null> {
  const { rows } = await pool.query(
    `SELECT ${GUIDE_WITH_STUDENT_SELECT}
     FROM guides g
     LEFT JOIN students s ON s.student_id = g.student_id
     WHERE g.student_id = $1;`,
    [student_id]
  );
  return enrichGuide(rows[0]) ?? null;
}

export async function getGuidesByStudentId(student_id: string): Promise<Guide[]> {
  const { rows } = await pool.query(
    `SELECT ${GUIDE_WITH_STUDENT_SELECT}
     FROM guides g
     LEFT JOIN students s ON s.student_id = g.student_id
     WHERE g.student_id = $1
     ORDER BY g.created_at DESC;`,
    [student_id]
  );
  return rows.map(enrichGuide) as Guide[];
}

export async function updateGuideMe(params: {
  guideId: string;
  student_id: string;
  department?: string | null;
  college?: string | null;
  hall?: string | null;
  year?: number | null;
  bio?: string | null;
  areas_of_expertise?: string[] | null;
  is_active?: boolean;
}): Promise<Guide | null> {
  const { guideId, student_id, department, college, hall, year, bio, areas_of_expertise, is_active } = params;

  const q = `
    UPDATE guides
    SET
      department = $1,
      college = $2,
      hall = $3,
      year = $4,
      bio = $5,
      areas_of_expertise = $6,
      is_active = COALESCE($7, is_active),
      updated_at = NOW()
    WHERE id = $8 AND student_id = $9
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [
    department ?? null,
    college ?? null,
    hall ?? null,
    year ?? null,
    bio ?? null,
    areas_of_expertise ?? [],
    is_active ?? null,
    guideId,
    student_id,
  ]);

  return rows[0] ?? null;
}

export async function toggleAvailability(params: {
  guideId: string;
  student_id: string;
  availability_status: 'available' | 'in_class' | 'at_dorm';
}): Promise<Guide | null> {
  const { guideId, student_id, availability_status } = params;

  const q = `
    UPDATE guides
    SET availability_status = $1,
        updated_at = NOW()
    WHERE id = $2 AND student_id = $3
    RETURNING *;
  `;

  const { rows } = await pool.query(q, [availability_status, guideId, student_id]);
  return rows[0] ?? null;
}

export async function incrementCompletedSessions(params: {
  guideId: string;
  delta?: number;
}): Promise<void> {
  const { guideId, delta = 1 } = params;
  await pool.query(
    `
    UPDATE guides
    SET completed_sessions = completed_sessions + $1,
        updated_at = NOW()
    WHERE id = $2;
    `,
    [delta, guideId]
  );
}

export async function updateGuideRating(guideId: string): Promise<void> {
  await pool.query(
    `
    UPDATE guides
    SET rating = COALESCE(
      (SELECT AVG(rating)::NUMERIC(3,2)
       FROM reviews
       WHERE guide_id = $1),
      0.00
    ),
    updated_at = NOW()
    WHERE id = $1;
    `,
    [guideId]
  );
}

