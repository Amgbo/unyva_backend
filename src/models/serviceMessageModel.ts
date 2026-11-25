// serviceMessageModel.ts
// In-app conversations between a customer and a service provider.
// A conversation is identified by (service_id, customer_id).
import { pool } from '../db.js';

export interface ServiceMessage {
  id: number;
  service_id: number;
  customer_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface ServiceMessageWithNames extends ServiceMessage {
  sender_name: string;
  receiver_name: string;
}

export interface ServiceMessageContext {
  id: number;
  title: string;
  price: string | null;
  price_negotiable: boolean | null;
  category: string | null;
  status: string | null;
  image_url: string | null;
  provider_id: string;
}

export interface ServiceThreadParticipant {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
  hall_of_residence: string | null;
  program: string | null;
}

// Primary image: service_images (primary first, then upload order), falling back
// to the legacy services.image_urls array.
const SERVICE_IMAGE_SQL = `
  COALESCE(
    (
      SELECT si.image_url
      FROM service_images si
      WHERE si.service_id = sv.id
      ORDER BY si.is_primary DESC NULLS LAST, si.upload_order ASC NULLS LAST, si.id ASC
      LIMIT 1
    ),
    sv.image_urls[1]
  )
`;

export const getServiceProvider = async (serviceId: number): Promise<string | null> => {
  const { rows } = await pool.query('SELECT student_id FROM services WHERE id = $1', [serviceId]);
  return rows[0]?.student_id ?? null;
};

// Minimal service info shown at the top of a chat.
export const getServiceMessageContext = async (serviceId: number): Promise<ServiceMessageContext | null> => {
  const { rows } = await pool.query(
    `SELECT
       sv.id,
       sv.title,
       sv.price,
       sv.price_negotiable,
       sv.category,
       sv.status,
       sv.student_id AS provider_id,
       ${SERVICE_IMAGE_SQL} AS image_url
     FROM services sv
     WHERE sv.id = $1`,
    [serviceId]
  );
  return rows[0] ?? null;
};

export const getServiceThreadParticipant = async (studentId: string): Promise<ServiceThreadParticipant | null> => {
  const { rows } = await pool.query(
    `SELECT student_id, first_name, last_name, profile_picture, hall_of_residence, program
     FROM students WHERE student_id = $1`,
    [studentId]
  );
  return rows[0] ?? null;
};

export const serviceThreadExists = async (serviceId: number, customerId: string): Promise<boolean> => {
  const { rows } = await pool.query(
    'SELECT 1 FROM service_messages WHERE service_id = $1 AND customer_id = $2 LIMIT 1',
    [serviceId, customerId]
  );
  return rows.length > 0;
};

export const getServiceThreadMessages = async (
  serviceId: number,
  customerId: string
): Promise<ServiceMessageWithNames[]> => {
  const { rows } = await pool.query(
    `SELECT
       sm.*,
       CONCAT(s.first_name, ' ', s.last_name) AS sender_name,
       CONCAT(r.first_name, ' ', r.last_name) AS receiver_name
     FROM service_messages sm
     JOIN students s ON sm.sender_id = s.student_id
     JOIN students r ON sm.receiver_id = r.student_id
     WHERE sm.service_id = $1 AND sm.customer_id = $2
     ORDER BY sm.created_at ASC, sm.id ASC`,
    [serviceId, customerId]
  );
  return rows;
};

export const createServiceMessage = async (data: {
  service_id: number;
  customer_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
}): Promise<ServiceMessage> => {
  const { rows } = await pool.query(
    `INSERT INTO service_messages (service_id, customer_id, sender_id, receiver_id, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.service_id, data.customer_id, data.sender_id, data.receiver_id, data.message]
  );
  return rows[0];
};

export const markServiceThreadRead = async (
  serviceId: number,
  customerId: string,
  readerId: string
): Promise<void> => {
  await pool.query(
    `UPDATE service_messages
     SET is_read = TRUE
     WHERE service_id = $1 AND customer_id = $2 AND receiver_id = $3 AND is_read = FALSE`,
    [serviceId, customerId, readerId]
  );
};

// One row per conversation the user is part of (as customer or provider).
export const getServiceInbox = async (userId: string): Promise<any[]> => {
  const { rows } = await pool.query(
    `WITH threads AS (
       SELECT DISTINCT ON (sm.service_id, sm.customer_id)
         sm.service_id,
         sm.customer_id,
         sm.message    AS last_message,
         sm.created_at AS last_message_time
       FROM service_messages sm
       WHERE sm.sender_id = $1 OR sm.receiver_id = $1
       ORDER BY sm.service_id, sm.customer_id, sm.created_at DESC, sm.id DESC
     ),
     unread AS (
       SELECT service_id, customer_id, COUNT(*)::int AS unread_count
       FROM service_messages
       WHERE receiver_id = $1 AND is_read = FALSE
       GROUP BY service_id, customer_id
     )
     SELECT
       t.service_id,
       t.customer_id,
       t.last_message,
       t.last_message_time,
       COALESCE(u.unread_count, 0) AS unread_count,
       sv.title AS service_title,
       ${SERVICE_IMAGE_SQL} AS service_image,
       o.student_id AS other_user_id,
       o.first_name,
       o.last_name,
       o.profile_picture,
       o.hall_of_residence,
       o.program
     FROM threads t
     JOIN services sv ON sv.id = t.service_id
     LEFT JOIN unread u ON u.service_id = t.service_id AND u.customer_id = t.customer_id
     LEFT JOIN students o
       ON o.student_id = CASE WHEN t.customer_id = $1 THEN sv.student_id ELSE t.customer_id END
     ORDER BY t.last_message_time DESC`,
    [userId]
  );

  return rows.map((row: any) => ({
    service_id: row.service_id,
    customer_id: row.customer_id,
    service_title: row.service_title,
    service_image: row.service_image,
    last_message: row.last_message,
    last_message_time: row.last_message_time,
    unread_count: Number(row.unread_count) || 0,
    other_user_profile: row.other_user_id
      ? {
          id: row.other_user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          profile_picture: row.profile_picture,
          hall_of_residence: row.hall_of_residence,
          program: row.program,
        }
      : null,
  }));
};
