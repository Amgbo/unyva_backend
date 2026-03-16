import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import {
  getFoundItems,
  getFoundItemById,
  addFoundItem,
  updateFoundItem,
  deleteFoundItem,
  getMyFoundItems,
  claimFoundItem,
  resolveFoundItem,
  getCategories
} from '../controllers/foundItemsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

// Create conditional multer: found_items folder for local storage
const upload = createMulter(undefined, 'found_items');

// Rate limiting for found items endpoints
const createLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 found items per hour per user
  keyGenerator: (req: any) => req.user?.student_id || req.ip || 'unknown',
  message: 'Too many found items created. Please try again in an hour.'
});

const updateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 updates per 15 minutes
  keyGenerator: (req: any) => req.user?.student_id || req.ip || 'unknown',
  message: 'Too many updates. Please try again later.'
});

const router = Router();

// GET /api/found-items/categories - Get available categories (public)
router.get('/categories', getCategories);

// GET /api/found-items/my/items - Get current user's found items (protected)
router.get('/my/items', authMiddleware, getMyFoundItems);

// GET /api/found-items - Fetch all found items with filters (public)
router.get('/', getFoundItems);

// GET /api/found-items/:id - Fetch single found item by ID (public)
router.get('/:id', getFoundItemById);

// POST /api/found-items - Add new found item (protected)
router.post('/', authMiddleware, createLimiter, upload.array('images', 3), addFoundItem);

// PUT /api/found-items/:id - Update found item (protected, owner only)
router.put('/:id', authMiddleware, updateLimiter, updateFoundItem);

// DELETE /api/found-items/:id - Delete found item (protected, owner only)
router.delete('/:id', authMiddleware, updateLimiter, deleteFoundItem);

// POST /api/found-items/:id/claim - Mark item as claimed (protected, owner only)
router.post('/:id/claim', authMiddleware, claimFoundItem);

// POST /api/found-items/:id/resolve - Mark item as resolved (protected, owner only)
router.post('/:id/resolve', authMiddleware, resolveFoundItem);

export { router as foundItemsRouter };
