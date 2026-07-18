import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/categories - Get all categories
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('📂 Fetching categories...');

    const result = await pool.query(
      'SELECT id, name, description, icon, created_at FROM categories ORDER BY name ASC'
    );

    console.log('✅ Categories fetched successfully');
    res.status(200).json({
      success: true,
      categories: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Categories Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch categories',
      context: 'category/getCategories',
    });
  }
};

// GET /api/categories/:id - Get category by ID
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('📂 Fetching category by ID:', id);

    const result = await pool.query(
      'SELECT id, name, description, icon, created_at FROM categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Category not found'
      });
      return;
    }

    console.log('✅ Category fetched successfully');
    res.status(200).json({
      success: true,
      category: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Category By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch category',
      context: 'category/getCategoryById',
    });
  }
};

// POST /api/categories - Add new category (Admin only)
export const addCategory = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('📂 Adding new category...');

    const { name, description, icon } = req.body;
    const studentId = req.user?.student_id;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        error: 'Category name is required'
      });
      return;
    }

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to add category');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    console.log('✅ Admin access verified for student:', studentId);

    // Check if category already exists
    const existingResult = await pool.query(
      'SELECT id FROM categories WHERE name = $1',
      [name]
    );

    if (existingResult.rows.length > 0) {
      res.status(409).json({
        error: 'Category already exists'
      });
      return;
    }

    // Insert into database
    const result = await pool.query(
      'INSERT INTO categories (name, description, icon) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, icon || null]
    );

    console.log('✅ Category added successfully');
    res.status(201).json({
      success: true,
      message: 'Category added successfully',
      category: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add Category Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add category',
      context: 'category/addCategory',
    });
  }
};

// PUT /api/categories/:id - Update category (Admin only)
export const updateCategory = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;
    const studentId = req.user?.student_id;

    console.log('📂 Updating category:', id);

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to update category');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Check if category exists
    const existingResult = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        error: 'Category not found'
      });
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(icon);
    }

    if (updates.length === 0) {
      res.status(400).json({
        error: 'No fields to update'
      });
      return;
    }

    values.push(id);

    const query = `
      UPDATE categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    console.log('✅ Category updated successfully');
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Category Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update category',
      context: 'category/updateCategory',
    });
  }
};

// DELETE /api/categories/:id - Delete category (Admin only)
export const deleteCategory = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    console.log('🗑️ Deleting category:', id);

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to delete category');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Check if category exists
    const existingResult = await pool.query(
      'SELECT id FROM categories WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        error: 'Category not found'
      });
      return;
    }

    // Check if category is in use by products
    const productsResult = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category = $1',
      [existingResult.rows[0].name]
    );

    if (parseInt(productsResult.rows[0].count) > 0) {
      res.status(409).json({
        error: 'Cannot delete category that is in use by products'
      });
      return;
    }

    // Delete from database
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    console.log('✅ Category deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Category Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete category',
      context: 'category/deleteCategory',
    });
  }
};

// ---------------------------------------------------------------------------
// Backward-compatible exports (older routes expect these named exports)
// ---------------------------------------------------------------------------

// Older routes expected these “getAll*” names.
export const getAllProductCategories = getCategories;
export const getAllServiceCategories = getCategories;

// Aliases used by older code.
export const getAllCategories = getCategories;

// NOTE: do NOT re-export `getCategories` here; it already exists above.



// Stats/popular/suggestions endpoints aren’t implemented in this controller yet.
// For compile-time compatibility, map them to existing categories listing.
export const getCategoriesStats = getCategories;
export const getPopularCategoriesList = getCategories;
export const getProductCategory = getCategoryById;
export const getServiceCategory = getCategoryById;
export const getCategoriesForDropdown = getCategories;
export const getCategorySuggestions = getCategories;


