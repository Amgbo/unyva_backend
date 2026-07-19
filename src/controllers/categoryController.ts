// src/controllers/categoryController.ts
import { Request, Response } from 'express';
import {
  getProductCategories,
  getServiceCategories,
  getCategoryStats,
  getProductCategoryByName,
  getServiceCategoryByName,
  getPopularCategories,
  ProductCategory,
  ServiceCategory,
  CategoryStats
} from '../models/categoryModel.js';

// GET: All product categories
export const getAllProductCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await getProductCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      categories: categories,
      metadata: {
        type: 'products',
        total_categories: categories.length,
        active_categories: categories.filter(c => c.is_active).length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching product categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: All service categories
export const getAllServiceCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await getServiceCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      categories: categories,
      metadata: {
        type: 'services',
        total_categories: categories.length,
        active_categories: categories.filter(c => c.is_active).length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching service categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: All categories (products and services combined)
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const [productCategories, serviceCategories] = await Promise.all([
      getProductCategories(),
      getServiceCategories()
    ]);

    const allCategories = [
      ...productCategories.map(cat => ({ ...cat, type: 'products' })),
      ...serviceCategories.map(cat => ({ ...cat, type: 'services' }))
    ];

    res.status(200).json({
      success: true,
      count: allCategories.length,
      categories: allCategories,
      metadata: {
        product_categories: productCategories.length,
        service_categories: serviceCategories.length,
        total_categories: allCategories.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Category statistics
export const getCategoriesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getCategoryStats();

    res.status(200).json({
      success: true,
      count: stats.length,
      stats: stats,
      metadata: {
        total_categories: stats.length,
        total_products: stats.reduce((sum, stat) => sum + Number(stat.product_count), 0),
        total_services: stats.reduce((sum, stat) => sum + Number(stat.service_count), 0),
        total_listings: stats.reduce((sum, stat) => sum + Number(stat.total_count), 0)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching category statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Popular categories
export const getPopularCategoriesList = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 50) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 50.'
      });
      return;
    }

    const popularCategories = await getPopularCategories(limit);

    res.status(200).json({
      success: true,
      count: popularCategories.length,
      categories: popularCategories,
      metadata: {
        limit: limit,
        total_products: popularCategories.reduce((sum, cat) => sum + Number(cat.product_count), 0),
        total_services: popularCategories.reduce((sum, cat) => sum + Number(cat.service_count), 0),
        total_listings: popularCategories.reduce((sum, cat) => sum + Number(cat.total_count), 0)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching popular categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Single product category by name
export const getProductCategory = async (req: Request<{ name: string }>, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const category = await getProductCategoryByName(name);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Product category not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      category: category
    });
  } catch (error) {
    console.error('❌ Error fetching product category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Single service category by name
export const getServiceCategory = async (req: Request<{ name: string }>, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const category = await getServiceCategoryByName(name);

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Service category not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      category: category
    });
  } catch (error) {
    console.error('❌ Error fetching service category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Categories for dropdown/select (simplified format)
export const getCategoriesForDropdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string || 'all'; // 'products', 'services', or 'all'

    let categories: (ProductCategory | ServiceCategory)[] = [];

    if (type === 'products' || type === 'all') {
      const productCategories = await getProductCategories();
      categories = [...categories, ...productCategories.map(cat => ({ ...cat, type: 'products' }))];
    }

    if (type === 'services' || type === 'all') {
      const serviceCategories = await getServiceCategories();
      categories = [...categories, ...serviceCategories.map(cat => ({ ...cat, type: 'services' }))];
    }

    // Transform to dropdown format
    const dropdownCategories = categories.map(cat => ({
      value: cat.name,
      label: cat.display_name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      type: (cat as any).type || 'products'
    }));

    res.status(200).json({
      success: true,
      count: dropdownCategories.length,
      categories: dropdownCategories,
      metadata: {
        type: type,
        total_categories: dropdownCategories.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching categories for dropdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories for dropdown',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Category suggestions based on query
export const getCategorySuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string || 'all';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

    if (!query || query.length < 1) {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required and must be at least 1 character'
      });
      return;
    }

    if (isNaN(limit) || limit < 1 || limit > 20) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 20.'
      });
      return;
    }

    let categories: (ProductCategory | ServiceCategory)[] = [];

    if (type === 'products' || type === 'all') {
      const productCategories = await getProductCategories();
      categories = [...categories, ...productCategories];
    }

    if (type === 'services' || type === 'all') {
      const serviceCategories = await getServiceCategories();
      categories = [...categories, ...serviceCategories];
    }

    // Filter categories based on query
    const filteredCategories = categories.filter(cat =>
      cat.name.toLowerCase().includes(query.toLowerCase()) ||
      cat.display_name.toLowerCase().includes(query.toLowerCase()) ||
      cat.description.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);

    // Transform to suggestion format
    const suggestions = filteredCategories.map(cat => ({
      value: cat.name,
      label: cat.display_name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      type: type === 'all' ? (categories.indexOf(cat) < 6 ? 'products' : 'services') : type
    }));

    res.status(200).json({
      success: true,
      count: suggestions.length,
      query: query,
      suggestions: suggestions,
      metadata: {
        type: type,
        limit: limit,
        total_matches: suggestions.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching category suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
