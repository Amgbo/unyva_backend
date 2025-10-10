import { pool } from '../db.js';

export interface Service {
  id: number;
  student_id: string;
  title: string;
  description: string;
  price: number;
  category: 'Tutoring' | 'Laundry & Cleaning' | 'Cooking & Meal Prep' | 'IT & Tech Support' | 'Graphic Design' | 'Other';
  contact_method: 'WhatsApp' | 'Call' | 'SMS' | 'in_app';
  hall_id?: number;
  room_number?: string;
  status: 'draft' | 'available' | 'reserved' | 'archived';
  is_approved: boolean;
  view_count: number;
  price_negotiable: boolean;
  tags?: string[];
  availability_schedule?: any;
  image_urls?: string[];
  created_at: Date;
  updated_at: Date;
  last_bumped_at: Date;
}

export interface ServiceBooking {
  id: number;
  service_id: number;
  customer_id: string;
  provider_id: string;
  booking_date?: Date | null;
  booking_time?: string | null;
  duration?: number | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ServiceNotification {
  id: number;
  student_id: string;
  type: 'booking_request' | 'booking_confirmed' | 'booking_cancelled' | 'reminder' | 'payment_received';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: Date;
}

export interface ProviderStats {
  total_services: number;
  active_services: number;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
  total_earnings: number;
}

export interface ServiceImage {
  id: number;
  service_id: number;
  image_url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  upload_order: number;
  file_size?: number;
  storage_path?: string;
  created_at: Date;
}

export interface SearchFilters {
  query?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  halls?: number[];
  rating?: number;
  limit: number;
  offset: number;
  sortBy?: 'created_at' | 'price' | 'rating' | 'view_count';
}

export interface SearchResult {
  services: ServiceWithProvider[];
  total: number;
}

export interface ServiceWithProvider extends Service {
  images: string[];
  hall_name?: string;
  provider: {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile_picture?: string;
    rating: number;
    review_count: number;
  };
  category_info?: {
    name: string;
    description?: string;
    icon?: string;
  };
  average_rating?: number;
  review_count?: number;
}

export interface ServiceReview {
  id: number;
  service_id: number;
  booking_id?: number;
  customer_id: string;
  provider_id: string;
  rating: number;
  title?: string;
  comment?: string;
  is_verified: boolean;
  created_at: Date;
  customer_name?: string;
}

export interface CreateServiceData {
  student_id: string;
  title: string;
  description: string;
  price: number;
  category: Service['category'];
  contact_method: Service['contact_method'];
  hall_id?: number;
  room_number?: string;
  price_negotiable?: boolean;
  tags?: string[];
  availability_schedule?: any;
  image_urls?: string[];
}

export interface UpdateServiceData extends Partial<CreateServiceData> {
  id: number;
  status?: Service['status'];
}

// -------------------------
// Helper: normalize provider fields for mapping
const mapRowToServiceWithProvider = (row: any): ServiceWithProvider => {
  return {
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    average_rating: parseFloat(row.average_rating) || 0,
    review_count: parseInt(row.review_count) || 0,
    provider: {
      student_id: row.student_id,
      first_name: row.provider_first_name || '',
      last_name: row.provider_last_name || '',
      email: row.provider_email || '',
      phone: row.provider_phone || '',
      profile_picture: row.provider_profile_picture || row.profile_picture || '',
      rating: parseFloat(row.provider_rating) || 0,
      review_count: parseInt(row.provider_review_count) || 0,
    },
    category_info: row.category_name ? {
      name: row.category_name,
      description: row.category_description,
      icon: row.category_icon
    } : undefined
  };
};

// -------------------------
// Get single service by ID with provider details
export const getServiceById = async (id: number): Promise<ServiceWithProvider | null> => {
  // Validate input
  if (!id || isNaN(id) || id <= 0) {
    throw new Error('Invalid service ID: must be a positive number');
  }

  try {
    const query = `
      SELECT
        s.*,
        h.full_name as hall_name,
        p.first_name as provider_first_name,
        p.last_name as provider_last_name,
        p.email as provider_email,
        p.phone as provider_phone,
        p.profile_picture as provider_profile_picture,
        p.service_provider_rating as provider_rating,
        p.service_review_count as provider_review_count,
        sc.name as category_name,
        sc.description as category_description,
        sc.icon as category_icon,
        COALESCE((SELECT array_agg(si.image_url) FROM service_images si WHERE si.service_id = s.id), ARRAY[]::text[]) as images,
        COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as review_count
      FROM services s
      LEFT JOIN university_halls h ON s.hall_id = h.id
      LEFT JOIN students p ON s.student_id = p.student_id
      LEFT JOIN service_categories sc ON s.category = sc.name
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) return null;
    return mapRowToServiceWithProvider(result.rows[0]);
  } catch (error) {
    console.error('Database error in getServiceById:', error);
    throw error;
  }
};

// -------------------------
// Get services by student (provider)
export const getServicesByStudent = async (student_id: string): Promise<ServiceWithProvider[]> => {
  try {
    const query = `
      SELECT
        s.*,
        h.full_name as hall_name,
        COALESCE((SELECT array_agg(si.image_url) FROM service_images si WHERE si.service_id = s.id), ARRAY[]::text[]) as images,
        COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as review_count
      FROM services s
      LEFT JOIN university_halls h ON s.hall_id = h.id
      WHERE s.student_id = $1
      ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query, [student_id]);
    return result.rows.map(mapRowToServiceWithProvider);
  } catch (error) {
    console.error('Database error in getServicesByStudent:', error);
    throw error;
  }
};

// -------------------------
// Get related services
export const getRelatedServices = async (
  serviceId: number,
  category: string,
  hallId?: number,
  limit: number = 6
): Promise<ServiceWithProvider[]> => {
  try {
    let values: any[] = [category, serviceId];
    let q = `
      SELECT
        s.*,
        h.full_name as hall_name,
        COALESCE((SELECT array_agg(si.image_url) FROM service_images si WHERE si.service_id = s.id), ARRAY[]::text[]) as images,
        COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as review_count
      FROM services s
      LEFT JOIN university_halls h ON s.hall_id = h.id
      WHERE s.category = $1
        AND s.status = 'available'
        AND s.is_approved = true
        AND s.id != $2
    `;

    if (hallId) {
      values.push(hallId);
      q += ` AND s.hall_id = $${values.length}`;
    }

    values.push(limit);
    q += `
      ORDER BY COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) DESC, s.view_count DESC
      LIMIT $${values.length}
    `;

    const result = await pool.query(q, values);
    return result.rows.map(mapRowToServiceWithProvider);
  } catch (error) {
    console.error('Database error in getRelatedServices:', error);
    throw error;
  }
};

// -------------------------
// Get service reviews with pagination
export const getServiceReviews = async (
  serviceId: number,
  page: number = 1,
  limit: number = 10
): Promise<{ reviews: ServiceReview[]; total: number; hasMore: boolean }> => {
  try {
    const offset = (page - 1) * limit;

    const reviewsQuery = `
      SELECT
        sr.*,
        s.first_name || ' ' || s.last_name as customer_name
      FROM service_reviews sr
      LEFT JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.service_id = $1
      ORDER BY sr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM service_reviews
      WHERE service_id = $1
    `;

    const [reviewsResult, countResult] = await Promise.all([
      pool.query(reviewsQuery, [serviceId, limit, offset]),
      pool.query(countQuery, [serviceId])
    ]);

    const total = parseInt(countResult.rows[0].total, 10) || 0;
    const hasMore = offset + limit < total;

    return {
      reviews: reviewsResult.rows,
      total,
      hasMore
    };
  } catch (error) {
    console.error('Database error in getServiceReviews:', error);
    throw error;
  }
};

// -------------------------
// Create new service
export const createService = async (serviceData: CreateServiceData): Promise<Service> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      student_id,
      title,
      description,
      price,
      category,
      contact_method,
      hall_id,
      room_number,
      price_negotiable = false,
      tags = [],
      availability_schedule = {},
      image_urls = []
    } = serviceData;

    const query = `
      INSERT INTO services
      (student_id, title, description, price, category, contact_method,
       hall_id, room_number, status, is_approved, price_negotiable, tags,
       availability_schedule, image_urls, updated_at, last_bumped_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', true, $9, $10, $11::jsonb, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      student_id,
      title,
      description,
      price,
      category,
      contact_method,
      hall_id ?? null,
      room_number ?? null,
      price_negotiable,
      tags.length ? tags : null,
      JSON.stringify(availability_schedule || {}),
      image_urls.length ? image_urls : null
    ];

    const result = await client.query(query, values);
    const service = result.rows[0];

    // Insert images into service_images table
    if (image_urls.length > 0) {
      const imageInserts = image_urls.map((url, index) => ({
        service_id: service.id,
        image_url: url,
        is_primary: index === 0, // First image is primary
        upload_order: index,
        storage_path: null, // Can be set if needed
        file_size: null // Can be set if needed
      }));

      const imageQuery = `
        INSERT INTO service_images
        (service_id, image_url, is_primary, upload_order, storage_path, file_size)
        VALUES ${imageInserts.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
      `;

      const imageValues = imageInserts.flatMap(img => [
        img.service_id,
        img.image_url,
        img.is_primary,
        img.upload_order,
        img.storage_path,
        img.file_size
      ]);

      await client.query(imageQuery, imageValues);
    }

    await client.query('COMMIT');
    return service;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error in createService:', error);
    throw error;
  } finally {
    client.release();
  }
};

// -------------------------
// Update service (dynamic safe updates)
export const updateService = async (id: number, updateData: UpdateServiceData): Promise<Service | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updateData.title);
    }
    if (updateData.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      values.push(updateData.price);
    }
    if (updateData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updateData.description);
    }
    if (updateData.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(updateData.category);
    }
    if (updateData.contact_method !== undefined) {
      fields.push(`contact_method = $${paramIndex++}`);
      values.push(updateData.contact_method);
    }
    if (updateData.hall_id !== undefined) {
      fields.push(`hall_id = $${paramIndex++}`);
      values.push(updateData.hall_id);
    }
    if (updateData.room_number !== undefined) {
      fields.push(`room_number = $${paramIndex++}`);
      values.push(updateData.room_number);
    }
    if (updateData.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }
    if (updateData.price_negotiable !== undefined) {
      fields.push(`price_negotiable = $${paramIndex++}`);
      values.push(updateData.price_negotiable);
    }
    if (updateData.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(updateData.tags.length ? updateData.tags : null);
    }
    if (updateData.availability_schedule !== undefined) {
      fields.push(`availability_schedule = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updateData.availability_schedule));
    }
    if (updateData.image_urls !== undefined) {
      fields.push(`image_urls = $${paramIndex++}`);
      values.push(updateData.image_urls.length ? updateData.image_urls : null);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Finally add id param
    values.push(id);
    const idParamIndex = values.length;

    const query = `
      UPDATE services
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idParamIndex}
      RETURNING *
    `;

    const result = await client.query(query, values);
    const service = result.rows.length ? result.rows[0] : null;

    if (!service) {
      await client.query('ROLLBACK');
      return null;
    }

    // Handle image updates if image_urls provided
    if (updateData.image_urls !== undefined) {
      // Delete existing images
      await client.query('DELETE FROM service_images WHERE service_id = $1', [id]);

      // Insert new images
      if (updateData.image_urls.length > 0) {
        const imageInserts = updateData.image_urls.map((url, index) => ({
          service_id: id,
          image_url: url,
          is_primary: index === 0, // First image is primary
          upload_order: index,
          storage_path: null, // Can be set if needed
          file_size: null // Can be set if needed
        }));

        const imageQuery = `
          INSERT INTO service_images
          (service_id, image_url, is_primary, upload_order, storage_path, file_size)
          VALUES ${imageInserts.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
        `;

        const imageValues = imageInserts.flatMap(img => [
          img.service_id,
          img.image_url,
          img.is_primary,
          img.upload_order,
          img.storage_path,
          img.file_size
        ]);

        await client.query(imageQuery, imageValues);
      }
    }

    await client.query('COMMIT');
    return service;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error in updateService:', error);
    throw error;
  } finally {
    client.release();
  }
};

// -------------------------
// Delete service
export const deleteService = async (id: number, studentId: string): Promise<boolean> => {
  try {
    const query = 'DELETE FROM services WHERE id = $1 AND student_id = $2 RETURNING id';
    const result = await pool.query(query, [id, studentId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database error in deleteService:', error);
    throw error;
  }
};

// -------------------------
// Search services with filters (fixed param handling)
export const searchServices = async (filters: SearchFilters): Promise<SearchResult> => {
  try {
    const {
      query: qtext,
      categories,
      minPrice,
      maxPrice,
      halls,
      rating,
      limit,
      offset,
      sortBy = 'created_at'
    } = filters;

    const whereClauses: string[] = ['s.status = $1', 's.is_approved = $2'];
    const values: any[] = ['available', true];
    let paramIndex = values.length + 1; // next available param position

    // search text
    if (qtext) {
      whereClauses.push(`(s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex} OR s.tags && $${paramIndex + 1})`);
      values.push(`%${qtext}%`, [qtext]);
      paramIndex += 2;
    }

    // categories
    if (categories && categories.length > 0) {
      whereClauses.push(`s.category = ANY($${paramIndex})`);
      values.push(categories);
      paramIndex++;
    }

    // price min/max
    if (minPrice !== undefined) {
      whereClauses.push(`s.price >= $${paramIndex}`);
      values.push(minPrice);
      paramIndex++;
    }
    if (maxPrice !== undefined) {
      whereClauses.push(`s.price <= $${paramIndex}`);
      values.push(maxPrice);
      paramIndex++;
    }

    // halls
    if (halls && halls.length > 0) {
      whereClauses.push(`s.hall_id = ANY($${paramIndex})`);
      values.push(halls);
      paramIndex++;
    }

    // rating (we use subquery avg)
    if (rating !== undefined) {
      whereClauses.push(`COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) >= $${paramIndex}`);
      values.push(rating);
      paramIndex++;
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // sort
    let sortClause = 's.created_at DESC';
    switch (sortBy) {
      case 'price':
        sortClause = 's.price ASC';
        break;
      case 'rating':
        sortClause = 'COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) DESC';
        break;
      case 'view_count':
        sortClause = 's.view_count DESC';
        break;
    }

    // count query (use same whereClause and same initial values slice)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM services s
      ${whereClause}
    `;

    // services query - use subselects to avoid GROUP BY
    // add final limit and offset params
    values.push(limit, offset);
    const limitParamIndex = values.length - 1; // position of limit
    const offsetParamIndex = values.length; // position of offset

    const servicesQuery = `
      SELECT
        s.*,
        h.full_name as hall_name,
        p.first_name as provider_first_name,
        p.last_name as provider_last_name,
        p.email as provider_email,
        p.phone as provider_phone,
        p.profile_picture as provider_profile_picture,
        p.service_provider_rating as provider_rating,
        p.service_review_count as provider_review_count,
        COALESCE(s.image_urls, (SELECT array_agg(si.image_url) FROM service_images si WHERE si.service_id = s.id), ARRAY[]::text[]) as images,
        COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as review_count
      FROM services s
      LEFT JOIN university_halls h ON s.hall_id = h.id
      LEFT JOIN students p ON s.student_id = p.student_id
      ${whereClause}
      ORDER BY ${sortClause}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    // For countQuery we must pass only the parameters used in whereClause.
    // The number of params consumed by whereClause equals (values.length - 2) before we pushed limit/offset.
    // Build slice for count depends on how many values were used for whereClause:
    const countParams = values.slice(0, paramIndex - 1); // paramIndex after building whereClause points to next param
    // paramIndex - 1 equals number of params used for whereClause.

    const [countResult, servicesResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(servicesQuery, values)
    ]);

    const total = parseInt(countResult.rows[0].total, 10) || 0;
    const services = servicesResult.rows.map(mapRowToServiceWithProvider);

    return { services, total };
  } catch (error) {
    console.error('Database error in searchServices:', error);
    throw error;
  }
};

// -------------------------
// Provider stats
export const getProviderStats = async (studentId: string): Promise<ProviderStats> => {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT s.id) as total_services,
        COUNT(DISTINCT CASE WHEN s.status = 'available' THEN s.id END) as active_services,
        COUNT(DISTINCT sb.id) as total_bookings,
        COUNT(DISTINCT CASE WHEN sb.status = 'completed' THEN sb.id END) as completed_bookings,
        COALESCE(AVG(sr.rating), 0) as average_rating,
        COUNT(DISTINCT sr.id) as total_reviews,
        COALESCE(SUM(CASE WHEN sb.status = 'completed' THEN sb.price END), 0) as total_earnings
      FROM students st
      LEFT JOIN services s ON st.student_id = s.student_id
      LEFT JOIN service_bookings sb ON s.id = sb.service_id
      LEFT JOIN service_reviews sr ON s.id = sr.service_id
      WHERE st.student_id = $1
    `;
    const result = await pool.query(query, [studentId]);
    const row = result.rows[0];

    return {
      total_services: parseInt(row.total_services, 10) || 0,
      active_services: parseInt(row.active_services, 10) || 0,
      total_bookings: parseInt(row.total_bookings, 10) || 0,
      completed_bookings: parseInt(row.completed_bookings, 10) || 0,
      average_rating: parseFloat(row.average_rating) || 0,
      total_reviews: parseInt(row.total_reviews, 10) || 0,
      total_earnings: parseFloat(row.total_earnings) || 0
    };
  } catch (error) {
    console.error('Database error in getProviderStats:', error);
    throw error;
  }
};

// -------------------------
// Create booking
export const createBooking = async (bookingData: Omit<ServiceBooking, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceBooking> => {
  try {
    const query = `
      INSERT INTO service_bookings
      (service_id, customer_id, provider_id, booking_date, booking_time, duration, status, price, notes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const values = [
      bookingData.service_id,
      bookingData.customer_id,
      bookingData.provider_id,
      bookingData.booking_date,
      bookingData.booking_time,
      bookingData.duration,
      bookingData.status,
      bookingData.price,
      bookingData.notes ?? null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createBooking:', error);
    throw error;
  }
};

// -------------------------
// Booking helpers
export const getBookingById = async (bookingId: number): Promise<ServiceBooking | null> => {
  // Validate input - handle NaN and invalid values
  console.log('🔍 getBookingById called with:', bookingId, typeof bookingId);
  if (typeof bookingId !== 'number' || isNaN(bookingId) || bookingId <= 0) {
    console.log('❌ Invalid booking ID in getBookingById:', bookingId, typeof bookingId);
    throw new Error('Invalid booking ID: must be a positive number');
  }

  try {
    const query = 'SELECT * FROM service_bookings WHERE id = $1';
    const result = await pool.query(query, [bookingId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error('Database error in getBookingById:', error);
    throw error;
  }
};

export const getProviderBookings = async (providerId: string): Promise<ServiceBooking[]> => {
  try {
    const query = `
      SELECT sb.*, s.title as service_title, c.first_name as customer_first_name, c.last_name as customer_last_name
      FROM service_bookings sb
      LEFT JOIN services s ON sb.service_id = s.id
      LEFT JOIN students c ON sb.customer_id = c.student_id
      WHERE sb.provider_id = $1
      ORDER BY sb.created_at DESC
    `;
    const result = await pool.query(query, [providerId]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getProviderBookings:', error);
    throw error;
  }
};

export const getBuyerBookings = async (buyerId: string): Promise<ServiceBooking[]> => {
  try {
    const query = `
      SELECT sb.*, s.title as service_title, p.first_name as provider_first_name, p.last_name as provider_last_name, sb.service_id
      FROM service_bookings sb
      LEFT JOIN services s ON sb.service_id = s.id
      LEFT JOIN students p ON sb.provider_id = p.student_id
      WHERE sb.customer_id = $1
      ORDER BY sb.created_at DESC
    `;
    const result = await pool.query(query, [buyerId]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getBuyerBookings:', error);
    throw error;
  }
};

export const updateBookingStatus = async (bookingId: number, status: ServiceBooking['status']): Promise<ServiceBooking | null> => {
  try {
    const query = `
      UPDATE service_bookings
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, bookingId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error('Database error in updateBookingStatus:', error);
    throw error;
  }
};

// -------------------------
// Notifications
export const createNotification = async (notificationData: Omit<ServiceNotification, 'id' | 'created_at'>): Promise<ServiceNotification> => {
  try {
    const query = `
      INSERT INTO service_notifications
      (student_id, type, title, message, data, is_read)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      notificationData.student_id,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data ?? {}),
      notificationData.is_read ?? false
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createNotification:', error);
    throw error;
  }
};

export const getUserNotifications = async (studentId: string): Promise<ServiceNotification[]> => {
  try {
    const query = `
      SELECT * FROM service_notifications
      WHERE student_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [studentId]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getUserNotifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: number): Promise<ServiceNotification | null> => {
  try {
    const query = `
      UPDATE service_notifications
      SET is_read = true
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [notificationId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error('Database error in markNotificationAsRead:', error);
    throw error;
  }
};

// -------------------------
// Reviews
export const createReview = async (reviewData: Omit<ServiceReview, 'id' | 'created_at'>): Promise<ServiceReview> => {
  try {
    const query = `
      INSERT INTO service_reviews
      (service_id, booking_id, customer_id, provider_id, rating, title, comment, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      reviewData.service_id,
      reviewData.booking_id ?? null,
      reviewData.customer_id,
      reviewData.provider_id,
      reviewData.rating,
      reviewData.title ?? null,
      reviewData.comment ?? null,
      reviewData.is_verified ?? false
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createReview:', error);
    throw error;
  }
};

// -------------------------
// Get featured services (subselects to avoid GROUP BY)
export const getFeaturedServices = async (limit: number = 10, excludeStudentId?: string): Promise<ServiceWithProvider[]> => {
  try {
    const values: any[] = [];
    let q = `
      SELECT
        s.*,
        h.full_name as hall_name,
        p.first_name as provider_first_name,
        p.last_name as provider_last_name,
        p.profile_picture as provider_profile_picture,
        p.service_provider_rating as provider_rating,
        p.service_review_count as provider_review_count,
        COALESCE((SELECT array_agg(si.image_url) FROM service_images si WHERE si.service_id = s.id), ARRAY[]::text[]) as images,
        COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as review_count
      FROM services s
      LEFT JOIN university_halls h ON s.hall_id = h.id
      LEFT JOIN students p ON s.student_id = p.student_id
      WHERE s.status = 'available' AND s.is_approved = true
    `;

    if (excludeStudentId) {
      values.push(excludeStudentId);
      q += ` AND s.student_id != $${values.length}`;
    }

    values.push(limit);
    q += `
      ORDER BY COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) DESC, s.view_count DESC, s.last_bumped_at DESC
      LIMIT $${values.length}
    `;

    const result = await pool.query(q, values);
    return result.rows.map(mapRowToServiceWithProvider);
  } catch (error) {
    console.error('Database error in getFeaturedServices:', error);
    throw error;
  }
};

// -------------------------
// Recent services
export const getRecentServices = async (limit: number = 10): Promise<ServiceWithProvider[]> => {
  try {
    const query = `
      SELECT
        s.*,
        h.full_name as hall_name,
        p.first_name as provider_first_name,
        p.last_name as provider_last_name,
        p.service_provider_rating as provider_rating,
        p.service_review_count as provider_review_count,
        COALESCE((SELECT array_agg(si.image_url) FROM service_images si WHERE si.service_id = s.id), ARRAY[]::text[]) as images,
        COALESCE((SELECT AVG(rating) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id), 0) as review_count
      FROM services s
      LEFT JOIN university_halls h ON s.hall_id = h.id
      LEFT JOIN students p ON s.student_id = p.student_id
      WHERE s.status = 'available' AND s.is_approved = true
      ORDER BY s.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows.map(mapRowToServiceWithProvider);
  } catch (error) {
    console.error('Database error in getRecentServices:', error);
    throw error;
  }
};

// -------------------------
// Review helper functions
export const deleteServiceReview = async (reviewId: number): Promise<boolean> => {
  try {
    const query = 'DELETE FROM service_reviews WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [reviewId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database error in deleteServiceReview:', error);
    throw error;
  }
};

export const canUserReviewService = async (studentId: string, serviceId: number): Promise<boolean> => {
  try {
    // Check if user has already reviewed this service
    const existingReviewQuery = `
      SELECT id FROM service_reviews
      WHERE service_id = $1 AND customer_id = $2
    `;
    const existingResult = await pool.query(existingReviewQuery, [serviceId, studentId]);

    if (existingResult.rows.length > 0) {
      return false; // User has already reviewed this service
    }

    // For now, allow anyone to review any service (like products)
    // In the future, this could be restricted to users who have booked the service
    return true;
  } catch (error) {
    console.error('Database error in canUserReviewService:', error);
    throw error;
  }
};

export const getUserReviewForService = async (studentId: string, serviceId: number): Promise<ServiceReview | null> => {
  try {
    const query = `
      SELECT
        sr.*,
        s.first_name || ' ' || s.last_name as customer_name
      FROM service_reviews sr
      LEFT JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.service_id = $1 AND sr.customer_id = $2
    `;
    const result = await pool.query(query, [serviceId, studentId]);
    return result.rows.length ? result.rows[0] : null;
  } catch (error) {
    console.error('Database error in getUserReviewForService:', error);
    throw error;
  }
};

// -------------------------
// Update provider rating after review operations
export const updateProviderRating = async (providerId: string): Promise<void> => {
  try {
    const query = `
      UPDATE students
      SET
        service_provider_rating = COALESCE((
          SELECT AVG(rating) FROM service_reviews
          WHERE provider_id = $1
        ), 0),
        service_review_count = COALESCE((
          SELECT COUNT(*) FROM service_reviews
          WHERE provider_id = $1
        ), 0)
      WHERE student_id = $1
    `;
    await pool.query(query, [providerId]);
  } catch (error) {
    console.error('Database error in updateProviderRating:', error);
    throw error;
  }
};
