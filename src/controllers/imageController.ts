import { Request, Response } from 'express';
import imagekit, { shouldUseImageKit } from '../config/imagekit.js';
import { getLocalUrl, deleteLocalFile } from '../config/multer.js';
import { handleControllerError } from '../utils/apiError.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// POST /api/images/upload - Upload an image
export const uploadImage = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('📸 Image upload request received');

    if (!req.file) {
      res.status(400).json({
        error: 'No image file provided'
      });
      return;
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      res.status(400).json({
        error: 'File size too large. Maximum size is 5MB.'
      });
      return;
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      res.status(400).json({
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
      });
      return;
    }

    let imageUrl: string;

    if (shouldUseImageKit() && imagekit) {
      // Upload to ImageKit
      const result = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${Date.now()}-${req.file.originalname}`,
        folder: "/unyva_uploads",
      });
      imageUrl = result.url;
      console.log('✅ Image uploaded to ImageKit:', imageUrl);
    } else {
      // Saved locally by multer
      const filename = (req.file.filename as string) || req.file.originalname;
      imageUrl = getLocalUrl('products', filename);
      console.log('✅ Image saved locally:', imageUrl);
    }

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      image_url: imageUrl
    });
  } catch (err: any) {
    console.error('❌ Upload Image Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to upload image',
      context: 'image/uploadImage',
    });
  }
};

// POST /api/images/upload-multiple - Upload multiple images
export const uploadMultipleImages = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('📸 Multiple image upload request received');

    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        error: 'No image files provided'
      });
      return;
    }

    if (req.files.length > 5) {
      res.status(400).json({
        error: 'Maximum 5 images allowed per upload'
      });
      return;
    }

    const imageUrls: string[] = [];

    for (const file of req.files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        res.status(400).json({
          error: `File ${file.originalname} is too large. Maximum size is 5MB.`
        });
        return;
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        res.status(400).json({
          error: `Invalid file type for ${file.originalname}. Only JPEG, PNG, WebP, and GIF are allowed.`
        });
        return;
      }

      if (shouldUseImageKit() && imagekit) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: `${Date.now()}-${file.originalname}`,
          folder: "/unyva_uploads",
        });
        imageUrls.push(result.url);
      } else {
        const filename = (file.filename as string) || file.originalname;
        imageUrls.push(getLocalUrl('products', filename));
      }
    }

    console.log('✅ Multiple images uploaded successfully:', imageUrls.length, 'images');

    res.status(201).json({
      success: true,
      message: `${imageUrls.length} images uploaded successfully`,
      image_urls: imageUrls
    });
  } catch (err: any) {
    console.error('❌ Upload Multiple Images Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to upload images',
      context: 'image/uploadMultipleImages',
    });
  }
};

// DELETE /api/images/:filename - Delete an image (Admin only)
export const deleteImage = async (req: any, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const studentId = req.user?.student_id;

    console.log('🗑️ Deleting image:', filename);

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to delete image');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    if (shouldUseImageKit() && imagekit) {
      // For ImageKit, we need the fileId. The filename alone isn't enough.
      // This is a simplified implementation.
      await imagekit.deleteFile(filename);
      console.log('🗑️ Deleted image from ImageKit:', filename);
    } else {
      await deleteLocalFile('products', filename);
      console.log('🗑️ Deleted local image:', filename);
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Image Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'Failed to delete image',
      context: 'image/deleteImage',
    });
  }
};
