// src/routes/imageRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  uploadProductImage,
  uploadMultipleProductImages,
  deleteProductImage,
  getImageInfo
} from '../controllers/imageController.js';

// File filter for images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Configure multer with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files for multiple upload
  }
});

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
