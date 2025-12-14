// src/config/multer.ts
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { shouldUseImageKit } from './imagekit.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Helper: create or ensure directory exists
const ensureDir = (dir: string) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // ignore - race conditions are fine
  }
};

// Build file filter used both for memory and disk storage
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Create multer instance. fieldsFolderMap: map fieldname -> folder name (e.g. { profile_picture: 'profiles' })
export const createMulter = (fieldsFolderMap?: Record<string, string>, defaultFolder = 'uploads') => {
  const useImageKit = shouldUseImageKit();

  if (useImageKit) {
    // For ImageKit, keep files in memory as buffers
    return multer({
      storage: multer.memoryStorage(),
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE }
    });
  }

  // Local disk storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folder = (fieldsFolderMap && fieldsFolderMap[file.fieldname]) || defaultFolder;
      const dest = path.join(process.cwd(), 'uploads', folder);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/\s+/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    }
  });

  return multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });
};

// Helper to build local url
export const getLocalUrl = (folder: string, filename: string) => {
  return `/uploads/${folder}/${filename}`;
};

// Delete local file helper
export const deleteLocalFile = async (folder: string, filename: string) => {
  const filePath = path.join(process.cwd(), 'uploads', folder, filename);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (err) {
    // swallow error if file doesn't exist
    return false;
  }
};

export default createMulter;
