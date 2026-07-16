import { Request, Response } from 'express';
import { pool } from '../db.js';
import imagekit, { shouldUseImageKit } from '../config/imagekit.js';
import { getLocalUrl } from '../config/multer.js';
import { handleControllerError } from '../utils/apiError.js';

const MAX_IMAGES = 5;
const ALLOWED_CATEGORIES = ['Electronics', 'Books', 'Clothing', 'Furniture', 'Services', 'Other'];
const ALLOWED_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];

// GET /api/products - Get all products with filters
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, min_price, max_price, condition, student_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT p.*, s.first_name, s.last_name, s.profile_picture, s.hall_id, uh.full_name as hall_name
      FROM products p
      JOIN students s ON p.student_id = s.student_id
      LEFT JOIN university_halls uh ON s.hall_id = uh.id
      WHERE p.status = 'available'
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND p.category = $${paramIndex++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (min_price) {
      query += ` AND p.price >= $${paramIndex++}`;
      params.push(Number(min_price));
    }

    if (max_price) {
      query += ` AND p.price <= $${paramIndex++}`;
      params.push(Number(max_price));
    }

    if (condition) {
      query += ` AND p.condition = $${paramIndex++}`;
      params.push(condition);
    }

    if (student_id) {
      query += ` AND p.student_id = $${paramIndex++}`;
      params.push(student_id);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      products: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Products Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch products',
      context: 'product/getProducts',
    });
  }
};

// GET /api/products/:id - Get product by ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, s.first_name, s.last_name, s.profile_picture, s.hall_id, uh.full_name as hall_name
       FROM products p
       JOIN students s ON p.student_id = s.student_id
       LEFT JOIN university_halls uh ON s.hall_id = uh.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.status(200).json({
      success: true,
      product: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Product By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch product',
      context: 'product/getProductById',
    });
  }
};

// POST /api/products - Create new product
export const createProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { title, description, price, category, condition, images } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!title || !description || !price || !category) {
      res.status(400).json({ error: 'Title, description, price, and category are required' });
      return;
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Invalid category', allowed_categories: ALLOWED_CATEGORIES });
      return;
    }

    if (condition && !ALLOWED_CONDITIONS.includes(condition)) {
      res.status(400).json({ error: 'Invalid condition', allowed_conditions: ALLOWED_CONDITIONS });
      return;
    }

    if (Number(price) <= 0) {
      res.status(400).json({ error: 'Price must be greater than 0' });
      return;
    }

    let imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        if (shouldUseImageKit() && imagekit && file.buffer) {
          const result = await imagekit.upload({
            file: file.buffer,
            fileName: `${studentId}-${Date.now()}-${file.originalname}`,
            folder: '/unyva_products',
          });
          imageUrls.push(result.url);
        } else {
          const filename = (file.filename as string) || file.originalname;
          imageUrls.push(getLocalUrl('products', filename));
        }
      }
    } else if (images) {
      const parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
      if (Array.isArray(parsedImages)) {
        imageUrls = parsedImages.slice(0, MAX_IMAGES);
      }
    }

    if (imageUrls.length > MAX_IMAGES) {
      res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
      return;
    }

    const result = await pool.query(
      `INSERT INTO products (student_id, title, description, price, category, condition, images, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
       RETURNING *`,
      [studentId, title, description, price, category, condition || 'good', JSON.stringify(imageUrls)]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Create Product Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to create product',
      context: 'product/createProduct',
    });
  }
};

// PUT /api/products/:id - Update product
export const updateProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const { title, description, price, category, condition, images, status } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check ownership
    const productResult = await pool.query(
      'SELECT student_id, images FROM products WHERE id = $1',
      [id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    if (productResult.rows[0].student_id !== studentId) {
      res.status(403).json({ error: 'You can only update your own products' });
      return;
    }

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Invalid category', allowed_categories: ALLOWED_CATEGORIES });
      return;
    }

    if (condition && !ALLOWED_CONDITIONS.includes(condition)) {
      res.status(400).json({ error: 'Invalid condition', allowed_conditions: ALLOWED_CONDITIONS });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (price !== undefined) { updates.push(`price = $${paramIndex++}`); values.push(price); }
    if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }
    if (condition !== undefined) { updates.push(`condition = $${paramIndex++}`); values.push(condition); }
    if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status); }
    if (images !== undefined) {
      const imageArray = Array.isArray(images) ? images : JSON.parse(images);
      if (imageArray.length > MAX_IMAGES) {
        res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
        return;
      }
      updates.push(`images = $${paramIndex++}`);
      values.push(JSON.stringify(imageArray));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      product: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Product Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update product',
      context: 'product/updateProduct',
    });
  }
};

// DELETE /api/products/:id - Delete product
export const deleteProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const productResult = await pool.query(
      'SELECT student_id FROM products WHERE id = $1',
      [id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const isAdmin = studentId === '22243185';
    if (productResult.rows[0].student_id !== studentId && !isAdmin) {
      res.status(403).json({ error: 'You can only delete your own products' });
      return;
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Product Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete product',
      context: 'product/deleteProduct',
    });
  }
};

// GET /api/products/my/products - Get current user's products
export const getMyProducts = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT p.*, s.first_name, s.last_name
       FROM products p
       JOIN students s ON p.student_id = s.student_id
       WHERE p.student_id = $1
       ORDER BY p.created_at DESC`,
      [studentId]
    );

    res.status(200).json({
      success: true,
      products: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get My Products Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch your products',
      context: 'product/getMyProducts',
    });
  }
};
