import { pool } from '../db.js';

export interface Deal {
  id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDealData {
  product_id: number;
  buyer_id: string;
  seller_id: string;
}

export interface UpdateDealConfirmation {
  deal_id: number;
  user_id: string;
  user_type: 'buyer' | 'seller';
  confirmed: boolean;
}

export class DealModel {
  // Create a new deal (when buyer initiates transaction)
  static async createDeal(dealData: CreateDealData): Promise<Deal> {
    const { product_id, buyer_id, seller_id } = dealData;

    // Verify product exists and get seller
    const productQuery = 'SELECT student_id FROM products WHERE id = $1';
    const productResult = await pool.query(productQuery, [product_id]);

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const actualSellerId = productResult.rows[0].student_id;
    if (actualSellerId !== seller_id) {
      throw new Error('Seller ID mismatch');
    }

    // Check if deal already exists
    const existingQuery = 'SELECT id FROM deals WHERE product_id = $1 AND buyer_id = $2';
    const existingResult = await pool.query(existingQuery, [product_id, buyer_id]);

    if (existingResult.rows.length > 0) {
      throw new Error('Deal already exists for this product and buyer');
    }

    const insertQuery = `
      INSERT INTO deals (product_id, buyer_id, seller_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    try {
      const result = await pool.query(insertQuery, [product_id, buyer_id, seller_id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  }

  // Get deal by ID
  static async getDealById(dealId: number): Promise<Deal | null> {
    const query = 'SELECT * FROM deals WHERE id = $1';
    const result = await pool.query(query, [dealId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get deals for a user (buyer or seller)
  static async getUserDeals(userId: string, userType: 'buyer' | 'seller' = 'buyer'): Promise<Deal[]> {
    const idField = userType === 'buyer' ? 'buyer_id' : 'seller_id';
    const query = `
      SELECT d.*, p.title as product_title, p.price as product_price
      FROM deals d
      JOIN products p ON d.product_id = p.id
      WHERE d.${idField} = $1
      ORDER BY d.created_at DESC
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user deals:', error);
      throw error;
    }
  }

  // Confirm deal (buyer or seller confirms transaction)
  static async confirmDeal(updateData: UpdateDealConfirmation): Promise<Deal | null> {
    const { deal_id, user_id, user_type, confirmed } = updateData;

    // Get current deal
    const deal = await DealModel.getDealById(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    // Verify user is part of this deal
    if (user_type === 'buyer' && deal.buyer_id !== user_id) {
      throw new Error('Unauthorized: User is not the buyer');
    }
    if (user_type === 'seller' && deal.seller_id !== user_id) {
      throw new Error('Unauthorized: User is not the seller');
    }

    // Update confirmation
    const field = user_type === 'buyer' ? 'buyer_confirmed' : 'seller_confirmed';
    const query = `
      UPDATE deals
      SET ${field} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [confirmed, deal_id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error confirming deal:', error);
      throw error;
    }
  }

  // Check if deal is completed (both parties confirmed)
  static async isDealCompleted(dealId: number): Promise<boolean> {
    const deal = await DealModel.getDealById(dealId);
    return deal ? deal.buyer_confirmed && deal.seller_confirmed : false;
  }

  // Get completed deals for a seller (for calculating ratings)
  static async getCompletedDealsForSeller(sellerId: string): Promise<Deal[]> {
    const query = `
      SELECT * FROM deals
      WHERE seller_id = $1 AND buyer_confirmed = TRUE AND seller_confirmed = TRUE
      ORDER BY completed_at DESC
    `;

    try {
      const result = await pool.query(query, [sellerId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching completed deals:', error);
      throw error;
    }
  }

  // Delete deal (if needed for cleanup)
  static async deleteDeal(dealId: number, userId: string): Promise<boolean> {
    // Only allow deletion if deal is not completed
    const deal = await DealModel.getDealById(dealId);
    if (!deal) {
      return false;
    }

    if (deal.buyer_confirmed && deal.seller_confirmed) {
      throw new Error('Cannot delete completed deal');
    }

    // Only buyer or seller can delete
    if (deal.buyer_id !== userId && deal.seller_id !== userId) {
      throw new Error('Unauthorized to delete this deal');
    }

    const query = 'DELETE FROM deals WHERE id = $1';
    const result = await pool.query(query, [dealId]);
    return (result.rowCount ?? 0) > 0;
  }
}
