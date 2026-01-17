// userBehaviorModel.ts
import { pool } from '../db.js';

export interface ProductView {
  id: number;
  student_id: string;
  product_id: number;
  view_duration_seconds: number;
  viewed_at: Date;
  session_id?: string;
  device_info?: any;
  created_at: Date;
}

export interface SearchHistory {
  id: number;
  student_id?: string; // NULL for anonymous searches
  search_query: string;
  filters?: any;
  result_count: number;
  searched_at: Date;
  session_id?: string;
  device_info?: any;
  created_at: Date;
}

export interface UserInteraction {
  id: number;
  student_id: string;
  product_id?: number;
  service_id?: number;
  interaction_type: 'like' | 'favorite' | 'cart_add' | 'cart_remove' | 'purchase' | 'share' | 'report';
  metadata?: any;
  created_at: Date;
}

export interface ServiceView {
  id: number;
  student_id: string;
  service_id: number;
  view_duration_seconds: number;
  viewed_at: Date;
  session_id?: string;
  device_info?: any;
  created_at: Date;
}

export interface PurchaseHistory {
  id: number;
  student_id: string;
  product_id?: number;
  order_id?: number;
  quantity: number;
  price_at_purchase: number;
  purchased_at: Date;
  created_at: Date;
}

// Track product view
export const trackProductView = async (
  studentId: string,
  productId: number,
  viewDurationSeconds: number = 0,
  sessionId?: string,
  deviceInfo?: any
): Promise<ProductView> => {
  try {
    const query = `
      INSERT INTO product_views (student_id, product_id, view_duration_seconds, session_id, device_info)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [studentId, productId, viewDurationSeconds, sessionId, deviceInfo ? JSON.stringify(deviceInfo) : null];
    const result = await pool.query(query, values);

    // Update product view_count
    await pool.query(
      'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
      [productId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Database error in trackProductView:', error);
    throw error;
  }
};

// Track service view
export const trackServiceView = async (
  studentId: string,
  serviceId: number,
  viewDurationSeconds: number = 0,
  sessionId?: string,
  deviceInfo?: any
): Promise<ServiceView> => {
  try {
    const query = `
      INSERT INTO service_views (student_id, service_id, view_duration_seconds, session_id, device_info)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [studentId, serviceId, viewDurationSeconds, sessionId, deviceInfo ? JSON.stringify(deviceInfo) : null];
    const result = await pool.query(query, values);

    // Update service view_count
    await pool.query(
      'UPDATE services SET view_count = view_count + 1 WHERE id = $1',
      [serviceId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Database error in trackServiceView:', error);
    throw error;
  }
};

// Track search query
export const trackSearchQuery = async (
  searchQuery: string,
  studentId?: string,
  filters?: any,
  resultCount: number = 0,
  sessionId?: string,
  deviceInfo?: any
): Promise<SearchHistory> => {
  try {
    const query = `
      INSERT INTO search_history (student_id, search_query, filters, result_count, session_id, device_info)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      studentId || null,
      searchQuery,
      filters ? JSON.stringify(filters) : null,
      resultCount,
      sessionId,
      deviceInfo ? JSON.stringify(deviceInfo) : null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in trackSearchQuery:', error);
    throw error;
  }
};

// Track user interaction
export const trackUserInteraction = async (
  studentId: string,
  interactionType: UserInteraction['interaction_type'],
  productId?: number,
  serviceId?: number,
  metadata?: any
): Promise<UserInteraction> => {
  try {
    const query = `
      INSERT INTO user_interactions (student_id, product_id, service_id, interaction_type, metadata)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, product_id, interaction_type)
      WHERE product_id IS NOT NULL
      DO UPDATE SET
        metadata = EXCLUDED.metadata,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      studentId,
      productId || null,
      serviceId || null,
      interactionType,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Database error in trackUserInteraction:', error);
    throw error;
  }
};

// Get user's view history
export const getUserViewHistory = async (
  studentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ProductView[]> => {
  try {
    const query = `
      SELECT pv.*, p.title, p.price, p.category,
             JSON_AGG(pi.image_url) as images
      FROM product_views pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE pv.student_id = $1
      GROUP BY pv.id, p.id
      ORDER BY pv.viewed_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [studentId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getUserViewHistory:', error);
    throw error;
  }
};

// Get user's search history
export const getUserSearchHistory = async (
  studentId: string,
  limit: number = 20,
  offset: number = 0
): Promise<SearchHistory[]> => {
  try {
    const query = `
      SELECT * FROM search_history
      WHERE student_id = $1
      ORDER BY searched_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [studentId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getUserSearchHistory:', error);
    throw error;
  }
};

// Get user's purchase history
export const getUserPurchaseHistory = async (
  studentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PurchaseHistory[]> => {
  try {
    const query = `
      SELECT ph.*, p.title, p.category,
             JSON_AGG(pi.image_url) as images
      FROM purchase_history ph
      JOIN products p ON ph.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE ph.student_id = $1
      GROUP BY ph.id, p.id
      ORDER BY ph.purchased_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [studentId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Database error in getUserPurchaseHistory:', error);
    throw error;
  }
};

// Get user's interactions
export const getUserInteractions = async (
  studentId: string,
  interactionType?: UserInteraction['interaction_type'],
  limit: number = 50,
  offset: number = 0
): Promise<UserInteraction[]> => {
  try {
    let query = `
      SELECT ui.*, p.title as product_title, s.title as service_title
      FROM user_interactions ui
      LEFT JOIN products p ON ui.product_id = p.id
      LEFT JOIN services s ON ui.service_id = s.id
      WHERE ui.student_id = $1
    `;

    const values: any[] = [studentId];
    let paramCount = 2;

    if (interactionType) {
      query += ` AND ui.interaction_type = $${paramCount}`;
      values.push(interactionType);
      paramCount++;
    }

    query += ` ORDER BY ui.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Database error in getUserInteractions:', error);
    throw error;
  }
};

// Get personalized recommendations based on user behavior
export const getPersonalizedRecommendations = async (
  studentId: string,
  limit: number = 10
): Promise<{ products: any[], services: any[] }> => {
  try {
    // Get user's preferred categories from behavior
    const userCategoriesQuery = `
      SELECT
        'product_view' as type,
        p.category::text as category,
        COUNT(*)::numeric as score
      FROM product_views pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.student_id = $1 AND p.category IS NOT NULL AND trim(p.category::text) != ''
      GROUP BY p.category::text

      UNION ALL

      SELECT
        'product_purchase' as type,
        p.category::text as category,
        (COUNT(*) * 2)::numeric as score
      FROM purchase_history ph
      JOIN products p ON ph.product_id = p.id
      WHERE ph.student_id = $1 AND p.category IS NOT NULL AND trim(p.category::text) != ''
      GROUP BY p.category::text

      UNION ALL

      SELECT
        'service_view' as type,
        s.category::text as category,
        COUNT(*)::numeric as score
      FROM service_views sv
      JOIN services s ON sv.service_id = s.id
      WHERE sv.student_id = $1 AND s.category IS NOT NULL AND trim(s.category::text) != ''
      GROUP BY s.category::text

      UNION ALL

      SELECT
        'service_interaction' as type,
        s.category::text as category,
        (COUNT(*) * 1.5)::numeric as score
      FROM user_interactions ui
      JOIN services s ON ui.service_id = s.id
      WHERE ui.student_id = $1 AND ui.interaction_type IN ('like', 'favorite', 'cart_add')
        AND s.category IS NOT NULL AND trim(s.category::text) != ''
      GROUP BY s.category::text

      ORDER BY score DESC
      LIMIT 5
    `;

  const categoriesResult = await pool.query(userCategoriesQuery, [studentId]);
  // Normalize categories to string array and log for debugging
  const preferredCategories = categoriesResult.rows
    .map(row => row.category)
    .filter(cat => cat && typeof cat === 'string' && cat.trim().length > 0);
  console.log('Preferred categories for recommendations:', preferredCategories);

    // Get product recommendations
    let productQuery;
    let productValues: any[] = [studentId, Math.ceil(limit / 2)];

    if (preferredCategories.length > 0) {
      productQuery = `
        SELECT p.id,
               p.student_id,
               p.title,
               p.price,
               p.description,
               p.category,
               p.condition,
               p.contact_method,
               p.hall_id,
               p.room_number,
               p.status,
               p.is_approved,
               p.view_count,
               p.price_negotiable,
               p.tags,
               p.quantity,
               p.created_at,
               p.updated_at,
               p.last_bumped_at,
               p.rating,
               p.review_count,
               h.full_name as hall_name,
               s.first_name || ' ' || s.last_name as student_name,
               COALESCE(
                 JSON_AGG(
                   JSON_BUILD_OBJECT(
                     'id', pi.id,
                     'product_id', pi.product_id,
                     'image_url', pi.image_url,
                     'thumbnail_url', pi.thumbnail_url,
                     'is_primary', pi.is_primary,
                     'upload_order', pi.upload_order
                   )
                 ) FILTER (WHERE pi.id IS NOT NULL),
                 '[]'::json
               ) as images,
               -- Calculate recommendation score
               (
                 CASE WHEN p.category = ANY($3::text[]) THEN 3 ELSE 0 END +
                 (p.view_count * 0.1) +
                 EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.last_bumped_at)) * (-0.01)
               ) as recommendation_score
        FROM products p
        LEFT JOIN university_halls h ON p.hall_id = h.id
        LEFT JOIN students s ON p.student_id = s.student_id
        LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.status IN ('available', 'sold', 'pending')
          AND p.is_approved = true
          AND p.quantity > 0
          AND p.student_id != $1
        GROUP BY p.id, p.student_id, p.title, p.price, p.description, p.category, p.condition, p.contact_method, p.hall_id, p.room_number, p.status, p.is_approved, p.view_count, p.price_negotiable, p.tags, p.quantity, p.created_at, p.updated_at, p.last_bumped_at, p.rating, p.review_count, h.full_name, s.first_name, s.last_name
        ORDER BY recommendation_score DESC, p.last_bumped_at DESC
        LIMIT $2
      `;
      productValues.push(preferredCategories);
    } else {
      // Fallback to general popular products
      productQuery = `
        SELECT p.id,
               p.student_id,
               p.title,
               p.price,
               p.description,
               p.category,
               p.condition,
               p.contact_method,
               p.hall_id,
               p.room_number,
               p.status,
               p.is_approved,
               p.view_count,
               p.price_negotiable,
               p.tags,
               p.quantity,
               p.created_at,
               p.updated_at,
               p.last_bumped_at,
               p.rating,
               p.review_count,
               h.full_name as hall_name,
               s.first_name || ' ' || s.last_name as student_name,
               COALESCE(
                 JSON_AGG(
                   JSON_BUILD_OBJECT(
                     'id', pi.id,
                     'product_id', pi.product_id,
                     'image_url', pi.image_url,
                     'thumbnail_url', pi.thumbnail_url,
                     'is_primary', pi.is_primary,
                     'upload_order', pi.upload_order
                   )
                 ) FILTER (WHERE pi.id IS NOT NULL),
                 '[]'::json
               ) as images,
               (p.view_count * 0.1 + EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.last_bumped_at)) * (-0.01)) as recommendation_score
        FROM products p
        LEFT JOIN university_halls h ON p.hall_id = h.id
        LEFT JOIN students s ON p.student_id = s.student_id
        LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.status IN ('available', 'sold', 'pending')
          AND p.is_approved = true
          AND p.quantity > 0
          AND p.student_id != $1
        GROUP BY p.id, p.student_id, p.title, p.price, p.description, p.category, p.condition, p.contact_method, p.hall_id, p.room_number, p.status, p.is_approved, p.view_count, p.price_negotiable, p.tags, p.quantity, p.created_at, p.updated_at, p.last_bumped_at, p.rating, p.review_count, h.full_name, s.first_name, s.last_name
        ORDER BY recommendation_score DESC, p.last_bumped_at DESC
        LIMIT $2
      `;
    }

    // Get service recommendations
    let serviceQuery;
    let serviceValues: any[] = [studentId, Math.ceil(limit / 2)];

    if (preferredCategories.length > 0) {
      serviceQuery = `
        SELECT s.id,
               s.student_id,
               s.title,
               s.description,
               s.category,
               s.price,
               s.status,
               s.is_approved,
               s.view_count,
               s.created_at,
               s.updated_at,
               s.image_urls,
               st.first_name || ' ' || st.last_name as provider_name,
               -- Calculate recommendation score
               (
                 CASE WHEN s.category = ANY($3::text[]) THEN 3 ELSE 0 END +
                 (s.view_count * 0.1) +
                 EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.created_at)) * (-0.01)
               ) as recommendation_score
        FROM services s
        LEFT JOIN students st ON s.student_id = st.student_id
        WHERE s.status IN ('available', 'reserved')
          AND s.is_approved = true
          AND s.student_id != $1
        ORDER BY recommendation_score DESC, s.created_at DESC
        LIMIT $2
      `;
      serviceValues.push(preferredCategories);
    } else {
      // Fallback to general popular services
      serviceQuery = `
        SELECT s.id,
               s.student_id,
               s.title,
               s.description,
               s.category,
               s.price,
               s.status,
               s.is_approved,
               s.view_count,
               s.created_at,
               s.updated_at,
               s.image_urls,
               st.first_name || ' ' || st.last_name as provider_name,
               (s.view_count * 0.1 + EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.created_at)) * (-0.01)) as recommendation_score
        FROM services s
        LEFT JOIN students st ON s.student_id = st.student_id
        WHERE s.status IN ('available', 'reserved')
          AND s.is_approved = true
          AND s.student_id != $1
        ORDER BY recommendation_score DESC, s.created_at DESC
        LIMIT $2
      `;
    }

    const [productResult, serviceResult] = await Promise.all([
      pool.query(productQuery, productValues),
      pool.query(serviceQuery, serviceValues)
    ]);

    return {
      products: productResult.rows.map(row => ({
        ...row,
        images: Array.isArray(row.images) ? row.images : []
      })),
      services: serviceResult.rows
    };
  } catch (error) {
    console.error('Database error in getPersonalizedRecommendations:', error);
    throw error;
  }
};

// Get trending items (products and services) based on community behavior
export const getTrendingItems = async (
  limit: number = 10,
  timeframeHours: number = 24
): Promise<{ products: any[], services: any[] }> => {
  try {
    // Get trending products
    const productQuery = `
      SELECT p.*,
             h.full_name as hall_name,
             s.first_name || ' ' || s.last_name as student_name,
             COUNT(pv.id) as recent_views,
             COUNT(DISTINCT pv.student_id) as unique_viewers,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', pi.id,
                   'product_id', pi.product_id,
                   'image_url', pi.image_url,
                   'thumbnail_url', pi.thumbnail_url,
                   'is_primary', pi.is_primary,
                   'upload_order', pi.upload_order
                 )
               ) FILTER (WHERE pi.id IS NOT NULL),
               '[]'
             ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_views pv ON p.id = pv.product_id
        AND pv.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '${timeframeHours} hours'
      WHERE p.status IN ('available', 'sold', 'pending')
        AND p.is_approved = true
        AND p.quantity > 0
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      ORDER BY recent_views DESC, unique_viewers DESC, p.last_bumped_at DESC
      LIMIT $1
    `;

    // Get trending services
    const serviceQuery = `
      SELECT s.*,
             st.first_name || ' ' || st.last_name as provider_name,
             COUNT(sv.id) as recent_views,
             COUNT(DISTINCT sv.student_id) as unique_viewers,
             COUNT(ui.id) as recent_interactions
      FROM services s
      LEFT JOIN students st ON s.student_id = st.student_id
      LEFT JOIN service_views sv ON s.id = sv.service_id
        AND sv.viewed_at >= CURRENT_TIMESTAMP - INTERVAL '${timeframeHours} hours'
      LEFT JOIN user_interactions ui ON s.id = ui.service_id
        AND ui.created_at >= CURRENT_TIMESTAMP - INTERVAL '${timeframeHours} hours'
        AND ui.interaction_type IN ('like', 'favorite', 'cart_add')
      WHERE s.status IN ('available', 'reserved')
        AND s.is_approved = true
      GROUP BY s.id, st.first_name, st.last_name
      ORDER BY (recent_views + recent_interactions) DESC, unique_viewers DESC, s.created_at DESC
      LIMIT $1
    `;

    const [productResult, serviceResult] = await Promise.all([
      pool.query(productQuery, [Math.ceil(limit / 2)]),
      pool.query(serviceQuery, [Math.ceil(limit / 2)])
    ]);

    return {
      products: productResult.rows.map(row => ({
        ...row,
        images: Array.isArray(row.images) ? row.images : []
      })),
      services: serviceResult.rows
    };
  } catch (error) {
    console.error('Database error in getTrendingItems:', error);
    throw error;
  }
};

// Keep the old function for backward compatibility
export const getTrendingProducts = async (
  limit: number = 10,
  timeframeHours: number = 24
): Promise<any[]> => {
  const result = await getTrendingItems(limit, timeframeHours);
  return result.products;
};
