// src/routes/imageRoutes.ts
import { Router } from 'express';
import { createMulter } from '../config/multer.js';
import {
  uploadProductImage,
  uploadMultipleProductImages,
  deleteProductImage,
  getImageInfo
} from '../controllers/imageController.js';

// Create conditional multer: products folder for local storage
const upload = createMulter(undefined, 'products');

const router = Router();

// POST: Upload single product image
router.post('/upload', upload.single('image'), uploadProductImage);

// POST: Upload multiple product images (up to 5)
router.post('/upload/multiple', upload.array('images', 5), uploadMultipleProductImages);

// DELETE: Delete uploaded image
router.delete('/:filename', deleteProductImage);

// GET: Get image information
router.get('/info/:filename', getImageInfo);

export default router;
