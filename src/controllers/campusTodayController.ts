import { Request, Response } from 'express';
import { pool } from '../db.js';
import imagekit, { shouldUseImageKit } from '../config/imagekit.js';
import { deleteLocalFile, getLocalUrl } from '../config/multer.js';

const CATEGORIES = ['events', 'item13', 'deals', 'announcements', 'opportunities', 'sports'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isAdmin = (req: any) => req.user?.student_id === '22243185' || req.user?.role === 'admin';
const asBoolean = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : value;
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const removeImage = async (url: string | null) => {
  if (!url) return;
  try {
    if (shouldUseImageKit() && imagekit) {
      await imagekit.deleteFile(url.split('/').pop() || '');
    } else {
      await deleteLocalFile('campus_today', url.split('/').pop() || '');
    }
  } catch (error) {
    console.error('Failed to remove Campus Today image:', error);
  }
};

const uploadImage = async (req: any): Promise<string | null> => {
  if (!req.file) return null;
  if (req.file.size > MAX_FILE_SIZE) throw new Error('File size too large. Maximum size is 5MB.');
  if (shouldUseImageKit() && imagekit) {
    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: `campus-today-${Date.now()}-${req.file.originalname}`,
      folder: '/unyva_campus_today',
    });
    return result.url;
  }
  return getLocalUrl('campus_today', req.file.filename || req.file.originalname);
};

const cleanDate = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const str = value.trim();
  if (str.includes('T')) return str.split('T')[0];
  return str;
};

const SELECT_FIELDS = `
  id, title, description, category, image_url,
  TO_CHAR(event_date, 'YYYY-MM-DD') AS event_date,
  event_time, location, organizer, is_featured, is_pinned,
  created_by, created_at, updated_at
`;

const validatePayload = (body: any, partial = false) => {
  const rawDate = body.event_date ?? body.date ?? (body.category === 'announcements' || !body.category ? todayIsoDate() : undefined);
  const values = {
    title: clean(body.title),
    description: clean(body.description ?? body.content),
    category: clean(body.category ?? 'announcements'),
    event_date: clean(cleanDate(rawDate)),
    event_time: clean(body.event_time),
    location: clean(body.location),
    organizer: clean(body.organizer),
  };
  if (!partial && (!values.title || !values.description || !values.category || !values.event_date)) {
    return { error: 'Title, description, category, and event_date are required' };
  }
  if (values.category !== undefined && (typeof values.category !== 'string' || !CATEGORIES.includes(values.category as any))) {
    return { error: `Category must be one of: ${CATEGORIES.join(', ')}` };
  }
  if (values.event_date !== undefined && !validDate(values.event_date)) {
    return { error: 'event_date must be a valid date in YYYY-MM-DD format' };
  }
  return { values };
};

// Public Campus Today reads.
export const getCampusToday = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = clean(req.query.category);
    const includeExpired = req.query.includeExpired === 'true';
    if (category && (typeof category !== 'string' || !CATEGORIES.includes(category as any))) {
      res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
      return;
    }
    const params: any[] = [];
    let where = '';
    if (category) {
      params.push(category);
      where = `WHERE category = $${params.length}`;
    }
    if (!includeExpired) where += `${where ? ' AND' : 'WHERE'} event_date >= CURRENT_DATE - INTERVAL '30 days'`;
    const result = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM campus_today ${where}
       ORDER BY is_pinned DESC, is_featured DESC,
         CASE WHEN event_date = CURRENT_DATE THEN 0 WHEN event_date > CURRENT_DATE THEN 1 ELSE 2 END,
         CASE WHEN event_date >= CURRENT_DATE THEN event_date END ASC NULLS LAST,
         event_date DESC, created_at DESC`,
      params
    );
    res.json({ success: true, posts: result.rows });
  } catch (error: any) {
    console.error('Get Campus Today Error:', error);
    res.status(500).json({ error: 'Failed to fetch Campus Today posts', message: error.message });
  }
};

export const getCampusTodayById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT ${SELECT_FIELDS} FROM campus_today WHERE id = $1`, [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: 'Campus Today post not found' });
      return;
    }
    res.json({ success: true, post: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch Campus Today post', message: error.message });
  }
};

// Admin Campus Today mutations.
export const createCampusToday = async (req: any, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(403).json({ error: 'Access denied. Admin privileges required.' }); return; }
  try {
    const validation = validatePayload(req.body);
    if (validation.error) { res.status(400).json({ error: validation.error }); return; }
    const values = validation.values!;
    const imageUrl = await uploadImage(req);
    const createdBy = req.user?.student_id || req.user?.id || '22243185';
    const result = await pool.query(
      `INSERT INTO campus_today
       (title, description, category, image_url, event_date, event_time, location, organizer, is_featured, is_pinned, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${SELECT_FIELDS}`,
      [values.title, values.description, values.category, imageUrl, values.event_date, values.event_time || null, values.location || null, values.organizer || null, asBoolean(req.body.is_featured), asBoolean(req.body.is_pinned), createdBy]
    );
    res.status(201).json({ success: true, post: result.rows[0] });
  } catch (error: any) {
    console.error('Create Campus Today Error:', error);
    res.status(error.message?.includes('File size') ? 400 : 500).json({ error: error.message || 'Failed to create Campus Today post' });
  }
};

export const updateCampusToday = async (req: any, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(403).json({ error: 'Access denied. Admin privileges required.' }); return; }
  try {
    const validation = validatePayload(req.body, req.method === 'PATCH');
    if (validation.error) { res.status(400).json({ error: validation.error }); return; }
    const current = await pool.query('SELECT * FROM campus_today WHERE id = $1', [req.params.id]);
    if (!current.rows.length) { res.status(404).json({ error: 'Campus Today post not found' }); return; }
    const old = current.rows[0];
    const values = validation.values!;
    const imageUrl = req.file ? await uploadImage(req) : old.image_url;
    const finalEventTime = values.event_time !== undefined ? (values.event_time || null) : old.event_time;
    const finalLocation = values.location !== undefined ? (values.location || null) : old.location;
    const finalOrganizer = values.organizer !== undefined ? (values.organizer || null) : old.organizer;
    const result = await pool.query(
      `UPDATE campus_today SET title=$1, description=$2, category=$3, image_url=$4, event_date=$5,
       event_time=$6, location=$7, organizer=$8, is_featured=$9, is_pinned=$10, updated_at=CURRENT_TIMESTAMP
       WHERE id=$11 RETURNING ${SELECT_FIELDS}`,
      [values.title ?? old.title, values.description ?? old.description, values.category ?? old.category, imageUrl,
        values.event_date ?? old.event_date, finalEventTime, finalLocation,
        finalOrganizer, req.body.is_featured === undefined ? old.is_featured : asBoolean(req.body.is_featured),
        req.body.is_pinned === undefined ? old.is_pinned : asBoolean(req.body.is_pinned), req.params.id]
    );
    if (req.file && old.image_url && old.image_url !== imageUrl) await removeImage(old.image_url);
    res.json({ success: true, post: result.rows[0] });
  } catch (error: any) {
    console.error('Update Campus Today Error:', error);
    res.status(error.message?.includes('File size') ? 400 : 500).json({ error: error.message || 'Failed to update Campus Today post' });
  }
};

export const deleteCampusToday = async (req: any, res: Response): Promise<void> => {
  if (!isAdmin(req)) { res.status(403).json({ error: 'Access denied. Admin privileges required.' }); return; }
  try {
    const result = await pool.query('DELETE FROM campus_today WHERE id = $1 RETURNING image_url', [req.params.id]);
    if (!result.rows.length) { res.status(404).json({ error: 'Campus Today post not found' }); return; }
    await removeImage(result.rows[0].image_url);
    res.json({ success: true, message: 'Campus Today post deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete Campus Today post', message: error.message });
  }
};
