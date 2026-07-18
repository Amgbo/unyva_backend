// src/routes/categoryRoutes.ts
import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

// GET: All categories
router.get('/', getCategories);

// GET: Category by ID
router.get('/:id', getCategoryById);

// POST: Add new category (Admin only)
router.post('/', verifyToken, addCategory);

// PUT: Update category (Admin only)
router.put('/:id', verifyToken, updateCategory);

// DELETE: Delete category (Admin only)
router.delete('/:id', verifyToken, deleteCategory);

export default router;