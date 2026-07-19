import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import { getPersonalizedRecommendations } from '../models/userBehaviorModel.js';
import { getAllProducts, getProductsByCategory, getFeaturedProducts } from '../models/productModel.js';
import { getFeaturedServices, getRelatedServices } from '../models/serviceModel.js';

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

    // Get personalized recommendations from behavior model
    const behaviorRecommendations = await getPersonalizedRecommendations(
      studentId,
      parseInt(limit as string)
    );

    // If behavior model returns products, use them; otherwise get featured products
    let products = [];
    if (behaviorRecommendations.products && behaviorRecommendations.products.length > 0) {
      // Try to get full product details with images for the recommended products
      const allProducts = await getAllProducts();
      products = behaviorRecommendations.products.map(rec => {
        const fullProduct = allProducts.find(p => p.id === rec.id);
        return fullProduct || rec;
      });
    } else {
      // Fallback to featured products
      products = await getFeaturedProducts(parseInt(limit as string));
    }

    // If behavior model returns services, use them; otherwise get featured services
    let services = [];
    if (behaviorRecommendations.services && behaviorRecommendations.services.length > 0) {
      services = behaviorRecommendations.services;
    } else {
      services = await getFeaturedServices(parseInt(limit as string));
    }

    res.status(200).json({
      products: products,
      services: services
    });
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

    // If behavior model doesn't return proper data, fallback to featured items
    let products = trending.products || [];
    let services = trending.services || [];

    if (!products.length) {
      products = await getFeaturedProducts(parseInt(limit as string));
    }

    if (!services.length) {
      services = await getFeaturedServices(parseInt(limit as string));
    }

    res.json({
      products: products,
      services: services
    });
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

    if (type === 'product') {
      // Get product details first to get category
      const product = await getAllProducts().then(products =>
        products.find(p => p.id === parseInt(itemId))
      );

      if (!product) {
        return res.status(404).json([]);
      }

      // Get related products from same category
      const relatedProducts = await getProductsByCategory(product.category, {
        limit: parseInt(limit as string),
        excludeStudentId: product.student_id
      });

      // Filter out the current product
      const filteredProducts = relatedProducts.filter(p => p.id !== parseInt(itemId));

      res.json(filteredProducts);
    } else if (type === 'service') {
      // For services, we'll return trending items as fallback since we don't have service categories implemented yet
      const trending = await getFeaturedProducts(parseInt(limit as string));
      res.json(trending);
    } else {
      return res.status(400).json([]);
    }
  } catch (error) {
    console.error('Error getting related items:', error);
    res.status(500).json([]);
  }
};
