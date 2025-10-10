// src/routes/categoryRoutes.ts
import { Router } from 'express';
import {
  getAllProductCategories,
  getAllServiceCategories,
  getAllCategories,
  getCategoriesStats,
  getPopularCategoriesList,
  getProductCategory,
  getServiceCategory,
  getCategoriesForDropdown,
  getCategorySuggestions
} from '../controllers/categoryController.js';

const router = Router();

// GET: All product categories
router.get('/products', getAllProductCategories);

// GET: All service categories
router.get('/services', getAllServiceCategories);

// GET: All categories (products and services)
router.get('/', getAllCategories);

// GET: Category statistics
router.get('/stats', getCategoriesStats);

// GET: Popular categories
router.get('/popular', getPopularCategoriesList);

// GET: Single product category by name
router.get('/products/:name', getProductCategory);

// GET: Single service category by name
router.get('/services/:name', getServiceCategory);

// GET: Categories for dropdown/select (simplified format)
router.get('/dropdown', getCategoriesForDropdown);

// GET: Category suggestions based on query
router.get('/suggestions', getCategorySuggestions);

export default router;
