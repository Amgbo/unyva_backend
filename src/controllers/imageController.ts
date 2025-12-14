// src/controllers/imageController.ts
import { Request, Response } from 'express';
import imagekit, { shouldUseImageKit } from '../config/imagekit.js';
import path from 'path';
import { getLocalUrl, deleteLocalFile } from '../config/multer.js';
import fs from 'fs';

// Configure upload limits and validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Helper function to validate image file
const validateImageFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size too large. Maximum size is 5MB.' };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' };
  }

  // Check file extension
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return { isValid: false, error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp are allowed.' };
  }

  return { isValid: true };
};

// Upload single image
export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
      return;
    }

    const validation = validateImageFile(req.file);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: validation.error
      });
      return;
    }

    // Conditional upload: ImageKit or local disk
    let imageUrl: string;
    if (shouldUseImageKit() && imagekit) {
      const result = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${Date.now()}-${req.file.originalname}`,
        folder: "/unyva_uploads",
      });
      imageUrl = result.url;
    } else {
      // Local storage: multer.diskStorage should have saved file to uploads/products
      // req.file.filename should be set by multer
      const filename = (req.file.filename as string) || req.file.originalname;
      imageUrl = getLocalUrl('products', filename);
    }

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Upload multiple images (up to 5)
export const uploadMultipleProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      res.status(400).json({
        success: false,
        error: 'No image files provided'
      });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const MAX_IMAGES = 5;

    if (files.length > MAX_IMAGES) {
      res.status(400).json({
        success: false,
        error: `Too many images. Maximum ${MAX_IMAGES} images allowed.`
      });
      return;
    }

    const uploadedImages: Array<{
      filename: string;
      originalName: string;
      size: number;
      mimetype: string;
      url: string;
    }> = [];

    const errors: string[] = [];

    // Validate and process each file
    for (const file of files) {
      const validation = validateImageFile(file);

      if (!validation.isValid) {
        errors.push(`${file.originalname}: ${validation.error}`);
        continue;
      }

      let imageUrl: string;
      if (shouldUseImageKit() && imagekit) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: `${Date.now()}-${file.originalname}`,
          folder: "/unyva_uploads",
        });
        imageUrl = result.url;
      } else {
        const filename = (file.filename as string) || file.originalname;
        imageUrl = getLocalUrl('products', filename);
      }
      uploadedImages.push({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: imageUrl
      });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Some images failed validation',
        details: errors,
        uploadedImages: uploadedImages.length > 0 ? uploadedImages : undefined
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: {
        count: uploadedImages.length,
        images: uploadedImages
      }
    });
  } catch (error) {
    console.error('❌ Error uploading multiple images:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to upload images',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete uploaded image
export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename) {
      res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
      return;
    }

    if (shouldUseImageKit() && imagekit) {
      // Delete from ImageKit using fileId (assuming filename is fileId)
      await imagekit.deleteFile(filename);
    } else {
      // Delete from local storage (products folder)
      await deleteLocalFile('products', filename);
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get image info
export const getImageInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename) {
      res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
      return;
    }

    if (shouldUseImageKit() && imagekit) {
      const result = await imagekit.getFileDetails(filename);
      res.status(200).json({
        success: true,
        data: {
          filename,
          url: result.url,
          size: result.size,
          createdAt: new Date(result.createdAt),
          modifiedAt: new Date(result.createdAt),
          width: result.width,
          height: result.height,
          format: result.fileType
        }
      });
    } else {
      // Local file info
      const filePath = path.join(process.cwd(), 'uploads', 'products', filename);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }
      const stats = await fs.promises.stat(filePath);
      res.status(200).json({
        success: true,
        data: {
          filename,
          url: getLocalUrl('products', filename),
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        }
      });
    }
  } catch (error) {
    console.error('❌ Error getting image info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
