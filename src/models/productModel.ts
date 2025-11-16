// productModel.ts
import { pool } from '../db.js';

export interface Product {
  id: number;
  student_id: string;
  title: string;
  price: number;
  description: string;
  category: 'Books' | 'Electronics' | 'Fashion' | 'Hostel Items' | 'Food' | 'Other';
  condition: 'New' | 'Used' | 'Like New' | 'Good' | 'Fair';
  contact_method: 'WhatsApp' | 'Call' | 'SMS' | 'in_app';
  hall_id?: number;
  room_number?: string;
  status: 'draft' | 'available' | 'pending' | 'reserved' | 'sold' | 'archived';
  is_approved: boolean;
  view_count: number;
  price_negotiable: boolean;
  tags?: string[];
  quantity: number;
  created_at: Date;
  updated_at: Date;
  last_bumped_at: Date;
}

export interface SellerProductsGrouped {
  available: ProductWithImages[];
  pending: {
    product: ProductWithImages;
    order: {
      id: number;
      customer_first_name: string;
      customer_last_name: string;
      customer_phone: string;
      customer_email?: string;
      delivery_option: string;
      special_instructions?: string;
      created_at: string;
    };
  }[];
  sold: ProductWithImages[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  upload_order: number;
  file_size?: number;
  storage_path?: string;
  created_at: Date;
}

export interface ProductWithImages extends Product {
  images: ProductImage[];
  hall_name?: string;
  student_name?: string;
}

export interface CreateProductData {
  student_id: string;
  title: string;
  price: number;
  description: string;
  category: Product['category'];
  condition: Product['condition'];
  contact_method: Product['contact_method'];
  hall_id?: number;
  room_number?: string;
  price_negotiable?: boolean;
  tags?: string[];
  quantity: number;
  image_urls?: string[];
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: number;
  status?: Product['status'];
}

// Get all products (excluding user's own products)
export const getAllProducts = async (excludeStudentId?: string): Promise<ProductWithImages[]> => {
  try {
    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true
    `;

    const values: any[] = [];

    if (excludeStudentId) {
      query += ` AND p.student_id != $1`;
      values.push(excludeStudentId);
    }

    query += `
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      ORDER BY p.last_bumped_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getAllProducts:', error);
    throw error;
  }
};

// Get products by student ID (for "My Listings")
export const getProductsByStudent = async (student_id: string): Promise<ProductWithImages[]> => {
  try {
    const query = `
      SELECT
        p.*,
        h.full_name as hall_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'product_id', pi.product_id,
              'image_url', pi.image_url,
              'thumbnail_url', pi.thumbnail_url,
              'is_primary', pi.is_primary,
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.student_id = $1
      GROUP BY p.id, h.full_name
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [student_id]);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getProductsByStudent:', error);
    throw error;
  }
};

// Get product by id
export const getProductById = async (id: number): Promise<ProductWithImages | null> => {
  try {
    const query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = $1
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    };
  } catch (error) {
    console.error('Database error in getProductById:', error);
    throw error;
  }
};

// Create new product
export const createProduct = async (productData: CreateProductData): Promise<Product> => {
  try {
    const {
      student_id,
      title,
      price,
      description,
      category,
      condition,
      contact_method,
      hall_id,
      room_number,
      price_negotiable = false,
      tags = [],
      quantity,
      image_urls = []
    } = productData;

    // Normalize condition to title case
    const normalizedCondition = condition.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

    const query = `
      INSERT INTO products
      (student_id, title, price, description, category, condition, contact_method,
       hall_id, room_number, status, is_approved, price_negotiable, tags, quantity, updated_at, last_bumped_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'available', true, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      student_id,
      title,
      price,
      description,
      category,
      normalizedCondition,
      contact_method,
      hall_id,
      room_number,
      price_negotiable,
      tags,
      quantity
    ];

    const result = await pool.query(query, values);
    const product = result.rows[0];

    // Add images if provided
    if (image_urls.length > 0) {
      const imageQuery = `
        INSERT INTO product_images (product_id, image_url, is_primary, upload_order)
        VALUES ($1, $2, $3, $4)
      `;

      for (let i = 0; i < image_urls.length; i++) {
        await pool.query(imageQuery, [product.id, image_urls[i], i === 0, i]);
      }
    }

    return product;
  } catch (error) {
    console.error('Database error in createProduct:', error);
    throw error;
  }
};

// Update product
export const updateProduct = async (id: number, updateData: UpdateProductData): Promise<Product | null> => {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic query based on provided fields
    if (updateData.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(updateData.title);
    }
    if (updateData.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(updateData.price);
    }
    if (updateData.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updateData.description);
    }
    if (updateData.category !== undefined) {
      fields.push(`category = $${paramCount++}`);
      values.push(updateData.category);
    }
    if (updateData.condition !== undefined) {
      // Normalize condition to title case
      const normalizedCondition = updateData.condition.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      fields.push(`condition = $${paramCount++}`);
      values.push(normalizedCondition);
    }
    if (updateData.contact_method !== undefined) {
      fields.push(`contact_method = $${paramCount++}`);
      values.push(updateData.contact_method);
    }
    if (updateData.hall_id !== undefined) {
      fields.push(`hall_id = $${paramCount++}`);
      values.push(updateData.hall_id);
    }
    if (updateData.room_number !== undefined) {
      fields.push(`room_number = $${paramCount++}`);
      values.push(updateData.room_number);
    }
    if (updateData.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updateData.status);
    }
    if (updateData.price_negotiable !== undefined) {
      fields.push(`price_negotiable = $${paramCount++}`);
      values.push(updateData.price_negotiable);
    }
    if (updateData.tags !== undefined) {
      fields.push(`tags = $${paramCount++}`);
      values.push(updateData.tags);
    }
    if (updateData.quantity !== undefined) {
      fields.push(`quantity = $${paramCount++}`);
      values.push(updateData.quantity);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Database error in updateProduct:', error);
    throw error;
  }
};

// Archive product (with ownership check) - sets status to 'archived'
export const deleteProduct = async (id: number, studentId: string): Promise<boolean> => {
  try {
    const query = 'UPDATE products SET status = \'archived\', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND student_id = $2 RETURNING id';
    const result = await pool.query(query, [id, studentId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Database error in deleteProduct:', error);
    throw error;
  }
};

// Advanced search and filter products
export const searchProducts = async (searchParams: {
  query?: string;
  category?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  conditions?: string[];
  hall_id?: number;
  halls?: number[];
  tags?: string[];
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popularity';
  excludeStudentId?: string;
  limit?: number;
  offset?: number;
}): Promise<ProductWithImages[]> => {
  try {
    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images,
        CASE
          WHEN $1::text IS NOT NULL THEN
            ts_rank_cd(
              to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.description, '')),
              plainto_tsquery('english', $1)
            )
          ELSE 0
        END as relevance_score
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true
    `;

    const values: any[] = [searchParams.query];

    // Text search with relevance scoring
    if (searchParams.query) {
      query += ` AND (
        to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', $${values.length})
        OR p.title ILIKE $${values.length + 1}
        OR p.description ILIKE $${values.length + 2}
      )`;
      values.push(`%${searchParams.query}%`, `%${searchParams.query}%`);
    }

    // Single category filter
    if (searchParams.category) {
      query += ` AND p.category = $${values.length + 1}`;
      values.push(searchParams.category);
    }

    // Multiple categories filter
    if (searchParams.categories && searchParams.categories.length > 0) {
      query += ` AND p.category = ANY($${values.length + 1})`;
      values.push(searchParams.categories);
    }

    // Price range filters
    if (searchParams.minPrice !== undefined) {
      query += ` AND p.price >= $${values.length + 1}`;
      values.push(searchParams.minPrice);
    }

    if (searchParams.maxPrice !== undefined) {
      query += ` AND p.price <= $${values.length + 1}`;
      values.push(searchParams.maxPrice);
    }

    // Single condition filter
    if (searchParams.condition) {
      query += ` AND p.condition = $${values.length + 1}`;
      values.push(searchParams.condition);
    }

    // Multiple conditions filter
    if (searchParams.conditions && searchParams.conditions.length > 0) {
      query += ` AND p.condition = ANY($${values.length + 1})`;
      values.push(searchParams.conditions);
    }

    // Single hall filter
    if (searchParams.hall_id) {
      query += ` AND p.hall_id = $${values.length + 1}`;
      values.push(searchParams.hall_id);
    }

    // Multiple halls filter
    if (searchParams.halls && searchParams.halls.length > 0) {
      query += ` AND p.hall_id = ANY($${values.length + 1})`;
      values.push(searchParams.halls);
    }

    // Tags filter (using array overlap)
    if (searchParams.tags && searchParams.tags.length > 0) {
      query += ` AND p.tags && $${values.length + 1}`;
      values.push(searchParams.tags);
    }

    // Exclude specific student
    if (searchParams.excludeStudentId) {
      query += ` AND p.student_id != $${values.length + 1}`;
      values.push(searchParams.excludeStudentId);
    }

    query += ` GROUP BY p.id, h.full_name, s.first_name, s.last_name`;

    // Dynamic sorting
    const sortBy = searchParams.sortBy || 'relevance';
    switch (sortBy) {
      case 'relevance':
        if (searchParams.query) {
          query += ` ORDER BY relevance_score DESC, p.last_bumped_at DESC`;
        } else {
          query += ` ORDER BY p.last_bumped_at DESC`;
        }
        break;
      case 'price_asc':
        query += ` ORDER BY p.price ASC, p.last_bumped_at DESC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC, p.last_bumped_at DESC`;
        break;
      case 'date_desc':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'date_asc':
        query += ` ORDER BY p.created_at ASC`;
        break;
      case 'popularity':
        query += ` ORDER BY p.view_count DESC, p.last_bumped_at DESC`;
        break;
      default:
        query += ` ORDER BY p.last_bumped_at DESC`;
    }

    // Pagination
    if (searchParams.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(searchParams.limit);
    }

    if (searchParams.offset) {
      query += ` OFFSET $${values.length + 1}`;
      values.push(searchParams.offset);
    }

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in searchProducts:', error);
    throw error;
  }
};

// Get featured products (high-rated, popular, recently bumped)
export const getFeaturedProducts = async (limit: number = 10, excludeStudentId?: string): Promise<ProductWithImages[]> => {
  try {
    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true
    `;

    const values: any[] = [];

    if (excludeStudentId) {
      query += ` AND p.student_id != $1`;
      values.push(excludeStudentId);
    }

    query += `
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      ORDER BY
        (p.view_count * 0.3 + EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.last_bumped_at)) * (-0.1)) DESC,
        p.last_bumped_at DESC
      LIMIT $${values.length + 1}
    `;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getFeaturedProducts:', error);
    throw error;
  }
};

// Get recent products (created in the last 48 hours)
export const getRecentProducts = async (limit: number = 20, excludeStudentId?: string): Promise<ProductWithImages[]> => {
  try {
    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true
        AND p.created_at >= NOW() - INTERVAL '48 hours'
    `;

    const values: any[] = [];

    if (excludeStudentId) {
      query += ` AND p.student_id != $1`;
      values.push(excludeStudentId);
    }

    query += `
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      ORDER BY p.created_at DESC
      LIMIT $${values.length + 1}
    `;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getRecentProducts:', error);
    throw error;
  }
};

// Get products by category with pagination
export const getProductsByCategory = async (
  category: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popularity';
    excludeStudentId?: string;
  } = {}
): Promise<ProductWithImages[]> => {
  try {
    const { limit = 20, offset = 0, sortBy = 'date_desc', excludeStudentId } = options;

    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true AND p.category = $1
    `;

    const values: any[] = [category];

    if (excludeStudentId) {
      query += ` AND p.student_id != $2`;
      values.push(excludeStudentId);
    }

    query += ` GROUP BY p.id, h.full_name, s.first_name, s.last_name`;

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'date_asc':
        query += ` ORDER BY p.created_at ASC`;
        break;
      case 'popularity':
        query += ` ORDER BY p.view_count DESC`;
        break;
      default:
        query += ` ORDER BY p.last_bumped_at DESC`;
    }

    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getProductsByCategory:', error);
    throw error;
  }
};

// Get product suggestions based on user preferences and popular items
// Get related products based on category and location
export const getRelatedProducts = async (
  productId: number,
  category: string,
  hallId?: number,
  limit: number = 8
): Promise<ProductWithImages[]> => {
  try {
    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true AND p.id != $1 AND p.category = $2
    `;

    const values: any[] = [productId, category];
    let paramCount = 3;

    // Ensure hallId is properly converted to number if it exists
    if (hallId !== undefined && hallId !== null) {
      const hallIdNum = typeof hallId === 'string' ? parseInt(hallId, 10) : hallId;
      if (!isNaN(hallIdNum)) {
        query += ` AND p.hall_id = $${paramCount}`;
        values.push(hallIdNum);
        paramCount++;
      }
    }

    query += `
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      ORDER BY p.view_count DESC, p.last_bumped_at DESC
      LIMIT $${paramCount}
    `;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getRelatedProducts:', error);
    throw error;
  }
};

// Get search filters and aggregations
export const getSearchFilters = async () => {
  try {
    const query = `
      SELECT
        'categories' as filter_type,
        array_agg(DISTINCT category) as values,
        count(DISTINCT category) as count
      FROM products
        WHERE status IN ('available', 'sold', 'pending') AND is_approved = true

      UNION ALL

      SELECT
        'conditions' as filter_type,
        array_agg(DISTINCT condition) as values,
        count(DISTINCT condition) as count
      FROM products
        WHERE status IN ('available', 'sold', 'pending') AND is_approved = true

      UNION ALL

      SELECT
        'halls' as filter_type,
        array_agg(DISTINCT h.id)::text[] as values,
        count(DISTINCT h.id) as count
      FROM products p
      JOIN university_halls h ON p.hall_id = h.id
        WHERE p.status IN ('available', 'sold', 'pending') AND p.is_approved = true

      UNION ALL

      SELECT
        'price_ranges' as filter_type,
        array_agg(DISTINCT
          CASE
            WHEN price < 10 THEN 'Under $10'
            WHEN price < 25 THEN '$10 - $25'
            WHEN price < 50 THEN '$25 - $50'
            WHEN price < 100 THEN '$50 - $100'
            WHEN price < 500 THEN '$100 - $500'
            ELSE 'Over $500'
          END
        ) as values,
        count(DISTINCT
          CASE
            WHEN price < 10 THEN 'Under $10'
            WHEN price < 25 THEN '$10 - $25'
            WHEN price < 50 THEN '$25 - $50'
            WHEN price < 100 THEN '$50 - $100'
            WHEN price < 500 THEN '$100 - $500'
            ELSE 'Over $500'
          END
        ) as count
      FROM products
        WHERE status IN ('available', 'sold', 'pending') AND is_approved = true AND price > 0
    `;

    const result = await pool.query(query);
    const filters: Record<string, any> = {};

    result.rows.forEach(row => {
      filters[row.filter_type] = {
        values: row.values || [],
        count: parseInt(row.count)
      };
    });

    return filters;
  } catch (error) {
    console.error('Database error in getSearchFilters:', error);
    throw error;
  }
};

// Get product suggestions based on user preferences and popular items
export const getProductSuggestions = async (
  studentId: string,
  limit: number = 10
): Promise<ProductWithImages[]> => {
  try {
    let query = `
      SELECT
        p.*,
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
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.status IN ('available', 'sold', 'pending')
        AND p.is_approved = true
        AND p.student_id != $1
      GROUP BY p.id, h.full_name, s.first_name, s.last_name
      ORDER BY
        -- Prioritize products from same hall as user
        CASE WHEN p.hall_id = (
          SELECT hall_id FROM students WHERE student_id = $1
        ) THEN 1 ELSE 2 END,
        -- Then by popularity and recency
        p.view_count DESC,
        p.last_bumped_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [studentId, limit]);
    return result.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));
  } catch (error) {
    console.error('Database error in getProductSuggestions:', error);
    throw error;
  }
};

// Get seller's products grouped by status
export const getSellerProductsGrouped = async (student_id: string): Promise<SellerProductsGrouped> => {
  try {
    // Get available products
    const availableQuery = `
      SELECT
        p.*,
        h.full_name as hall_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'product_id', pi.product_id,
              'image_url', pi.image_url,
              'thumbnail_url', pi.thumbnail_url,
              'is_primary', pi.is_primary,
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
  -- Only show products with status 'available' in the seller's "available" list
  -- Products remain perpetually available for purchase by other users
  WHERE p.student_id = $1 AND p.status = 'available'
      GROUP BY p.id, h.full_name
      ORDER BY p.created_at DESC
    `;

    // Get pending products with order info
    const pendingQuery = `
      SELECT
        p.*,
        h.full_name as hall_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'product_id', pi.product_id,
              'image_url', pi.image_url,
              'thumbnail_url', pi.thumbnail_url,
              'is_primary', pi.is_primary,
              'upload_order', pi.upload_order,
              'file_size', pi.file_size,
              'storage_path', pi.storage_path,
              'created_at', pi.created_at
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) as images,
        o.id as order_id,
        o.customer_id,
        o.delivery_option,
        o.special_instructions,
        o.created_at as order_created_at,
        s.first_name as customer_first_name,
        s.last_name as customer_last_name,
        s.phone as customer_phone,
        s.email as customer_email
      FROM products p
      LEFT JOIN university_halls h ON p.hall_id = h.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN orders o ON p.id = o.product_id AND o.status = 'confirmed' AND o.seller_id = p.student_id
      LEFT JOIN students s ON o.customer_id = s.student_id
      WHERE p.student_id = $1 AND p.status = 'pending'
      GROUP BY p.id, h.full_name, o.id, o.customer_id, o.delivery_option, o.special_instructions, o.created_at, s.first_name, s.last_name, s.phone, s.email
      ORDER BY p.created_at DESC
    `;

  // Get sold products as per-order rows so the same product appears once per completed order.
  // This allows the seller's Sold tab to list an item multiple times if it was sold multiple times.
  const soldQuery = `
    SELECT
      p.*, 
      o.id as order_id,
      o.quantity as order_quantity,
      o.delivery_option as order_delivery_option,
      o.created_at as order_created_at,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.phone as customer_phone,
      c.email as customer_email,
      h.full_name as hall_name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pi.id,
            'product_id', pi.product_id,
            'image_url', pi.image_url,
            'thumbnail_url', pi.thumbnail_url,
            'is_primary', pi.is_primary,
            'upload_order', pi.upload_order,
            'file_size', pi.file_size,
            'storage_path', pi.storage_path,
            'created_at', pi.created_at
          )
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) as images
    FROM orders o
    JOIN products p ON o.product_id = p.id
    LEFT JOIN students c ON o.customer_id = c.student_id
    LEFT JOIN university_halls h ON p.hall_id = h.id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE o.seller_id = $1 AND o.status IN ('confirmed', 'delivered')
    GROUP BY o.id, p.id, c.first_name, c.last_name, c.phone, c.email, h.full_name
    ORDER BY o.created_at DESC
  `;

    const [availableResult, pendingResult, soldResult] = await Promise.all([
      pool.query(availableQuery, [student_id]),
      pool.query(pendingQuery, [student_id]),
      pool.query(soldQuery, [student_id])
    ]);

    const available = availableResult.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));

    const pending = pendingResult.rows
      .filter(row => row.order_id)
      .map(row => ({
        product: {
          ...row,
          images: Array.isArray(row.images) ? row.images : []
        } as ProductWithImages,
        order: {
          id: row.order_id as number,
          customer_first_name: row.customer_first_name as string,
          customer_last_name: row.customer_last_name as string,
          customer_phone: row.customer_phone as string,
          customer_email: row.customer_email as string | undefined,
          delivery_option: row.delivery_option as string,
          special_instructions: row.special_instructions as string | undefined,
          created_at: row.order_created_at as string
        }
      }));

    const sold = soldResult.rows.map(row => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : []
    }));

    return { available, pending, sold };
  } catch (error) {
    console.error('Database error in getSellerProductsGrouped:', error);
    throw error;
  }
};
