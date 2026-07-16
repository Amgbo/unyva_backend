import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

// GET /api/deals - Get all active deals
export const getDeals = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('🏷️ Fetching deals...');

    const result = await pool.query(
      `SELECT d.*, p.title as product_title, p.price as original_price, p.images as product_images
       FROM deals d
       JOIN products p ON d.product_id = p.id
       WHERE d.is_active = true
       AND (d.end_date IS NULL OR d.end_date > NOW())
       ORDER BY d.created_at DESC`
    );

    console.log('✅ Deals fetched successfully');
    res.status(200).json({
      success: true,
      deals: result.rows
    });
  } catch (err: any) {
    console.error('❌ Get Deals Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch deals',
      context: 'deals/getDeals',
    });
  }
};

// GET /api/deals/:id - Get deal by ID
export const getDealById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('🏷️ Fetching deal by ID:', id);

    const result = await pool.query(
      `SELECT d.*, p.title as product_title, p.price as original_price, p.images as product_images
       FROM deals d
       JOIN products p ON d.product_id = p.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Deal not found'
      });
      return;
    }

    console.log('✅ Deal fetched successfully');
    res.status(200).json({
      success: true,
      deal: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Get Deal By ID Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to fetch deal',
      context: 'deals/getDealById',
    });
  }
};

// POST /api/deals - Add new deal (Admin only)
export const addDeal = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('🏷️ Adding new deal...');

    const { product_id, deal_price, discount_percentage, start_date, end_date } = req.body;
    const studentId = req.user?.student_id;

    // Validate required fields
    if (!product_id || !deal_price) {
      res.status(400).json({
        error: 'Product ID and deal price are required'
      });
      return;
    }

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to add deal');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Check if product exists
    const productResult = await pool.query(
      'SELECT id, price FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({
        error: 'Product not found'
      });
      return;
    }

    const originalPrice = parseFloat(productResult.rows[0].price);
    const dealPrice = parseFloat(deal_price);

    if (dealPrice >= originalPrice) {
      res.status(400).json({
        error: 'Deal price must be less than original price'
      });
      return;
    }

    // Calculate discount percentage if not provided
    const discount = discount_percentage || Math.round(((originalPrice - dealPrice) / originalPrice) * 100);

    // Insert into database
    const result = await pool.query(
      `INSERT INTO deals (product_id, deal_price, discount_percentage, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [product_id, dealPrice, discount, start_date || null, end_date || null]
    );

    console.log('✅ Deal added successfully');
    res.status(201).json({
      success: true,
      message: 'Deal added successfully',
      deal: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Add Deal Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to add deal',
      context: 'deals/addDeal',
    });
  }
};

// PUT /api/deals/:id - Update deal (Admin only)
export const updateDeal = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { deal_price, discount_percentage, start_date, end_date, is_active } = req.body;
    const studentId = req.user?.student_id;

    console.log('🏷️ Updating deal:', id);

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to update deal');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Check if deal exists
    const existingResult = await pool.query(
      'SELECT id FROM deals WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        error: 'Deal not found'
      });
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (deal_price !== undefined) {
      updates.push(`deal_price = $${paramIndex++}`);
      values.push(parseFloat(deal_price));
    }
    if (discount_percentage !== undefined) {
      updates.push(`discount_percentage = $${paramIndex++}`);
      values.push(discount_percentage);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      res.status(400).json({
        error: 'No fields to update'
      });
      return;
    }

    values.push(id);

    const query = `
      UPDATE deals 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    console.log('✅ Deal updated successfully');
    res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      deal: result.rows[0]
    });
  } catch (err: any) {
    console.error('❌ Update Deal Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to update deal',
      context: 'deals/updateDeal',
    });
  }
};

// DELETE /api/deals/:id - Delete deal (Admin only)
export const deleteDeal = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    console.log('🗑️ Deleting deal:', id);

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to delete deal');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Check if deal exists
    const existingResult = await pool.query(
      'SELECT id FROM deals WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        error: 'Deal not found'
      });
      return;
    }

    // Delete from database
    await pool.query('DELETE FROM deals WHERE id = $1', [id]);

    console.log('✅ Deal deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Deal Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete deal',
      context: 'deals/deleteDeal',
    });
  }
};
