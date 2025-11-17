// src/controllers/productController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import {
  getAllProducts,
  getProductById,
  getProductsByStudent,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  getProductsByCategory,
  getProductSuggestions,
  getSearchFilters,
  getRelatedProducts,
  getSellerProductsGrouped,
  ProductWithImages,
  CreateProductData,
  UpdateProductData,
  SellerProductsGrouped
} from '../models/productModel.js';

// GET: All available products (excluding user's own products)
export const getAllAvailableProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const excludeStudentId = req.query.excludeStudentId as string;
    const products = await getAllProducts(excludeStudentId);

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Single product by ID
export const getProduct = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    const product = await getProductById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Products by student ID (My Listings) - Grouped by status
export const getMyProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const groupedProducts = await getSellerProductsGrouped(studentId);

    res.status(200).json({
      success: true,
      data: groupedProducts
    });
  } catch (error) {
    console.error('❌ Error fetching user products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST: Create new product
export const createNewProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const productData: CreateProductData = {
      student_id: studentId,
      title: req.body.title,
      price: parseFloat(req.body.price),
      description: req.body.description,
      category: req.body.category,
      condition: req.body.condition,
      contact_method: req.body.contact_method,
      hall_id: req.body.hall_id ? parseInt(req.body.hall_id, 10) : undefined,
      room_number: req.body.room_number,
      price_negotiable: req.body.price_negotiable || false,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : [],
      quantity: req.body.quantity ? parseInt(req.body.quantity, 10) : 1,
      image_urls: req.body.image_urls ? (Array.isArray(req.body.image_urls) ? req.body.image_urls : [req.body.image_urls]) : []
    };

    // Validate required fields
    if (!productData.title || !productData.price || !productData.description ||
        !productData.category || !productData.condition || !productData.contact_method) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['title', 'price', 'description', 'category', 'condition', 'contact_method']
      });
      return;
    }

    // Validate price
    if (productData.price <= 0 || productData.price > 10000) {
      res.status(400).json({
        success: false,
        error: 'Price must be between 0.01 and 10000'
      });
      return;
    }

    const product = await createProduct(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT: Update product
export const updateExistingProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const studentId = req.user?.student_id;

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const updateData: UpdateProductData = {
      id: productId,
      title: req.body.title,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      description: req.body.description,
      category: req.body.category,
      condition: req.body.condition,
      contact_method: req.body.contact_method,
      hall_id: req.body.hall_id ? parseInt(req.body.hall_id, 10) : undefined,
      room_number: req.body.room_number,
      status: req.body.status,
      price_negotiable: req.body.price_negotiable,
      tags: req.body.tags,
      quantity: req.body.quantity ? parseInt(req.body.quantity, 10) : undefined
    };

    const updatedProduct = await updateProduct(productId, updateData);

    if (!updatedProduct) {
      res.status(404).json({
        success: false,
        error: 'Product not found or you do not have permission to update it'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT: Archive product (set status to 'archived')
export const archiveExistingProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const studentId = req.user?.student_id;

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const archived = await deleteProduct(productId, studentId);

    if (!archived) {
      res.status(404).json({
        success: false,
        error: 'Product not found or you do not have permission to archive it'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product archived successfully'
    });
  } catch (error) {
    console.error('❌ Error archiving product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Search products with filters
export const searchAndFilterProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const excludeStudentId = req.query.excludeStudentId as string;
    const searchParams = {
      query: req.query.query as string,
      category: req.query.category as string,
      categories: req.query.categories ? (Array.isArray(req.query.categories) ? req.query.categories as string[] : [req.query.categories as string]) : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      condition: req.query.condition as string,
      conditions: req.query.conditions ? (Array.isArray(req.query.conditions) ? req.query.conditions as string[] : [req.query.conditions as string]) : undefined,
      hall_id: req.query.hall_id ? parseInt(req.query.hall_id as string, 10) : undefined,
      halls: req.query.halls ? (Array.isArray(req.query.halls) ? req.query.halls.map(id => parseInt(id as string, 10)) : [parseInt(req.query.halls as string, 10)]) : undefined,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags as string[] : [req.query.tags as string]) : undefined,
      sortBy: req.query.sortBy as 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popularity',
      excludeStudentId,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    };

    const products = await searchProducts(searchParams);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
      filters: {
        query: searchParams.query,
        category: searchParams.category,
        categories: searchParams.categories,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
        condition: searchParams.condition,
        conditions: searchParams.conditions,
        hall_id: searchParams.hall_id,
        halls: searchParams.halls,
        tags: searchParams.tags,
        sortBy: searchParams.sortBy,
        limit: searchParams.limit,
        offset: searchParams.offset
      }
    });
  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Featured products (popular, recently bumped)
export const getFeaturedProductsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const excludeStudentId = req.query.excludeStudentId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const products = await getFeaturedProducts(limit, excludeStudentId);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
      featured: true
    });
  } catch (error) {
    console.error('❌ Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Products by category with pagination
export const getProductsByCategoryController = async (req: Request<{ category: string }>, res: Response): Promise<void> => {
  try {
    const { category } = req.params;
    const excludeStudentId = req.query.excludeStudentId as string;
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      sortBy: req.query.sortBy as 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popularity',
      excludeStudentId
    };

    const products = await getProductsByCategory(category, options);

    res.status(200).json({
      success: true,
      count: products.length,
      category,
      products,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        sortBy: options.sortBy
      }
    });
  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products by category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Product suggestions based on user preferences
export const getProductSuggestionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const products = await getProductSuggestions(studentId, limit);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
      personalized: true
    });
  } catch (error) {
    console.error('❌ Error fetching product suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Search filters and aggregations
export const getSearchFiltersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = await getSearchFilters();

    res.status(200).json({
      success: true,
      filters
    });
  } catch (error) {
    console.error('❌ Error fetching search filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search filters',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Related products
// GET: Related products
export const getRelatedProductsController = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    // Get the product first to get category and hall_id
    const product = await getProductById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    // Ensure hall_id is properly handled - it should already be a number from the database
    const hallId = product.hall_id; // This should be a number or undefined from the database
    
    // Get related products based on category and hall
    const relatedProducts = await getRelatedProducts(productId, product.category, hallId, limit);

    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      products: relatedProducts
    });
  } catch (error) {
    console.error('❌ Error fetching related products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch related products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT: Confirm delivered - Update product status to sold and order status to delivered
export const confirmDelivered = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const studentId = req.user?.student_id;

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    // Check if product belongs to user and is in pending status
    const checkQuery = `
      SELECT id, status FROM products
      WHERE id = $1 AND student_id = $2 AND status = 'pending'
    `;
    const checkResult = await pool.query(checkQuery, [productId, studentId]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Product not found or not in pending status'
      });
      return;
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Keep product status as 'available' so it remains purchasable by other users
      // Product sales are tracked through the orders table, not product status
      // For delivery confirmation, we don't change the status since delivery orders were set to 'pending'
      // and pickup orders remain 'available'
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 AND student_id = $2',
        [productId, studentId]
      );

      // Update order status to delivered (only for delivery orders)
      const updateOrderQuery = `
        UPDATE orders
        SET status = 'delivered', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $1 AND seller_id = $2 AND delivery_option = 'delivery'
      `;
      await client.query(updateOrderQuery, [productId, studentId]);

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Product marked as delivered successfully',
        product: productResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error confirming delivery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm delivery',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Popular searches
export const getPopularSearchesController = async (req: Request, res: Response): Promise<void> => {
  try {
    // For now, return some mock popular searches
    // In a real implementation, this would come from search analytics
    const popularSearches = [
      { query: 'textbook', count: 45 },
      { query: 'calculator', count: 32 },
      { query: 'laptop charger', count: 28 },
      { query: 'bike', count: 25 },
      { query: 'notes', count: 22 },
      { query: 'phone case', count: 18 },
      { query: 'headphones', count: 15 },
      { query: 'water bottle', count: 12 },
      { query: 'backpack', count: 10 },
      { query: 'umbrella', count: 8 }
    ];

    res.status(200).json({
      success: true,
      popularSearches
    });
  } catch (error) {
    console.error('❌ Error fetching popular searches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular searches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
