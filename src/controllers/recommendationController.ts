import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import { getPersonalizedRecommendations } from '../models/userBehaviorModel.js';

export const getPersonalizedRecommendationsController = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { limit = 20 } = req.query;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const recommendations = await getPersonalizedRecommendations(
      studentId,
      parseInt(limit as string)
    );

    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({ products: [], services: [] });
  }
};

export const getTrendingItems = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    // Get trending products and services based on recent views and interactions
    const { getTrendingItems: getTrendingItemsModel } = await import('../models/userBehaviorModel.js');

    const trending = await getTrendingItemsModel(parseInt(limit as string));

    res.json(trending);
  } catch (error) {
    console.error('Error getting trending items:', error);
    res.status(500).json({ products: [], services: [] });
  }
};

export const getRelatedItems = async (req: Request, res: Response) => {
  try {
    const { itemId, type } = req.params;
    const { limit = 10 } = req.query;

    if (!itemId || !type) {
      return res.status(400).json([]);
    }

    let itemQuery;
    let relatedQuery;

    if (type === 'product') {
      // Get product details
      itemQuery = await pool.query('SELECT * FROM products WHERE id = $1', [itemId]);

      if (itemQuery.rows.length === 0) {
        return res.status(404).json([]);
      }

      const category = itemQuery.rows[0].category;

      // Get related products from same category
      relatedQuery = await pool.query(
        'SELECT * FROM products WHERE category = $1 AND id != $2 AND status IN (\'available\', \'sold\', \'pending\') AND is_approved = true AND quantity > 0 ORDER BY created_at DESC LIMIT $3',
        [category, itemId, limit]
      );
    } else if (type === 'service') {
      // Get service details
      itemQuery = await pool.query('SELECT * FROM services WHERE id = $1', [itemId]);

      if (itemQuery.rows.length === 0) {
        return res.status(404).json([]);
      }

      const category = itemQuery.rows[0].category;

      // Get related services from same category
      relatedQuery = await pool.query(
        'SELECT * FROM services WHERE category = $1 AND id != $2 AND is_active = true ORDER BY rating DESC LIMIT $3',
        [category, itemId, limit]
      );
    } else {
      return res.status(400).json([]);
    }

    res.json(relatedQuery.rows);
  } catch (error) {
    console.error('Error getting related items:', error);
    res.status(500).json([]);
  }
};
