import { Request, Response } from 'express';
import { pool } from '../db.js';
import { notificationService } from '../services/notificationService.js';
import imagekit, { shouldUseImageKit } from '../config/imagekit.js';
import { getLocalUrl } from '../config/multer.js';

// Categories for found items
export const FOUND_ITEM_CATEGORIES = [
  'Electronics',
  'Books',
  'Wallet/Purse',
  'ID/Cards',
  'Clothing',
  'Keys',
  'Sports Equipment',
  'Other'
] as const;

// Contact methods (in_app is preferred for privacy)
export const CONTACT_METHODS = ['in_app', 'WhatsApp', 'Call', 'Email'] as const;

// Status values
export const ITEM_STATUS = ['active', 'claimed', 'resolved'] as const;

// Type definitions
export type FoundItemCategory = typeof FOUND_ITEM_CATEGORIES[number];
export type ContactMethod = typeof CONTACT_METHODS[number];
export type ItemStatus = typeof ITEM_STATUS[number];

interface FoundItem {
  id: number;
  student_id: string;
  title: string;
  description: string;
  category: string;
  location_description: string | null;
  hall_id: number | null;
  room_number: string | null;
  contact_method: string;
  contact_info: string | null;
  status: string;
  images: string[];
  item_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

type FoundItemImageRecord = {
  image_url?: unknown;
  url?: unknown;
  thumbnail_url?: unknown;
  thumbnail?: unknown;
  path?: unknown;
  src?: unknown;
};

const getRequestOrigin = (req: Request): string => {
  const configuredOrigin = process.env.PUBLIC_BACKEND_URL || process.env.API_BASE_URL;
  if (configuredOrigin && configuredOrigin.trim()) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const forwardedProtoHeader = req.headers['x-forwarded-proto'];
  const forwardedHostHeader = req.headers['x-forwarded-host'];

  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : (forwardedProtoHeader || '').split(',')[0];
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : (forwardedHostHeader || '').split(',')[0];

  const host = (forwardedHost || req.get('host') || '').trim();
  const protocol = (forwardedProto || req.protocol || 'http').trim();

  return host ? `${protocol}://${host}` : '';
};

const getCandidateUrlFromRecord = (value: FoundItemImageRecord): string => {
  const candidates = [
    value.image_url,
    value.url,
    value.thumbnail_url,
    value.thumbnail,
    value.path,
    value.src,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return '';
};

const normalizeFoundItemImageUrlForResponse = (value: string, req: Request): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const requestOrigin = getRequestOrigin(req);

  if (trimmed.startsWith('http')) {
    try {
      const parsed = new URL(trimmed);
      const uploadSegmentIndex = parsed.pathname.indexOf('/uploads/');

      // Always rebase local upload files to the same host serving this API request.
      if (uploadSegmentIndex >= 0 && requestOrigin) {
        const uploadPath = parsed.pathname.slice(uploadSegmentIndex);
        return `${requestOrigin}${uploadPath}${parsed.search}`;
      }

      return trimmed;
    } catch {
      return trimmed;
    }
  }

  if (!requestOrigin) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${requestOrigin}${normalizedPath}`;
};

const extractFoundItemImageUrls = (images: unknown, req: Request): string[] => {
  if (!images) {
    return [];
  }

  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed) {
      return [];
    }

    try {
      return extractFoundItemImageUrls(JSON.parse(trimmed), req);
    } catch {
      return [normalizeFoundItemImageUrlForResponse(trimmed, req)].filter(Boolean);
    }
  }

  if (Array.isArray(images)) {
    return images.flatMap((value) => extractFoundItemImageUrls(value, req));
  }

  if (typeof images === 'object') {
    const candidate = getCandidateUrlFromRecord(images as FoundItemImageRecord);
    return candidate ? [normalizeFoundItemImageUrlForResponse(candidate, req)] : [];
  }

  return [];
};

const normalizeFoundItemForResponse = (item: any, req: Request) => {
  const normalizedImages = extractFoundItemImageUrls(item.images, req);
  return {
    ...item,
    images: normalizedImages.filter((url, index) => normalizedImages.indexOf(url) === index),
  };
};

// GET /api/found-items - Fetch all found items with filters
export const getFoundItems = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📦 Fetching found items...');

    // Extract query parameters for filtering
    const { status, category, hall_id, item_date, limit = 50, offset = 0, search } = req.query;

    let query = `
      SELECT 
        fi.*,
        s.first_name,
        s.last_name,
        s.profile_picture,
        uh.full_name as hall_name
      FROM found_items fi
      LEFT JOIN students s ON fi.student_id = s.student_id
      LEFT JOIN university_halls uh ON fi.hall_id = uh.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (status) {
      query += ` AND fi.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND fi.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (hall_id) {
      query += ` AND fi.hall_id = $${paramIndex}`;
      params.push(hall_id);
      paramIndex++;
    }

    if (item_date) {
      query += ` AND fi.item_date >= $${paramIndex}`;
      params.push(item_date);
      paramIndex++;
    }

    if (search) {
      query += ` AND (fi.title ILIKE $${paramIndex} OR fi.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Order by most recent
    query += ` ORDER BY fi.created_at DESC`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM found_items fi WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND fi.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    if (category) {
      countQuery += ` AND fi.category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }
    if (hall_id) {
      countQuery += ` AND fi.hall_id = $${countParamIndex}`;
      countParams.push(hall_id);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (fi.title ILIKE $${countParamIndex} OR fi.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const normalizedItems = result.rows.map((row: any) => normalizeFoundItemForResponse(row, req));

    console.log('✅ Found items fetched successfully');
    res.status(200).json({
      success: true,
      found_items: normalizedItems,
      total: totalCount,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err: any) {
    console.error('❌ Get Found Items Error:', err);
    res.status(500).json({
      error: 'Failed to fetch found items',
      message: err.message
    });
  }
};

// GET /api/found-items/:id - Fetch single found item by ID
export const getFoundItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('📦 Fetching found item by ID:', id);

    const result = await pool.query(
      `SELECT 
        fi.*,
        s.first_name,
        s.last_name,
        s.profile_picture,
        s.phone,
        s.email,
        uh.full_name as hall_name
      FROM found_items fi
      LEFT JOIN students s ON fi.student_id = s.student_id
      LEFT JOIN university_halls uh ON fi.hall_id = uh.id
      WHERE fi.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Found item not found'
      });
      return;
    }

    const normalizedItem = normalizeFoundItemForResponse(result.rows[0], req);

    console.log('✅ Found item fetched successfully');
    res.status(200).json({
      success: true,
      found_item: normalizedItem
    });
  } catch (err: any) {
    console.error('❌ Get Found Item By ID Error:', err);
    res.status(500).json({
      error: 'Failed to fetch found item',
      message: err.message
    });
  }
};

// POST /api/found-items - Add new found item
export const addFoundItem = async (req: any, res: Response): Promise<void> => {
  try {
    console.log('📦 Adding new found item...');

    const {
      title,
      description,
      category,
      location_description,
      hall_id,
      room_number,
      contact_method,
      contact_info,
      item_date
    } = req.body;

    const studentId = req.user?.student_id;

    // Validate required fields
    if (!title || !description || !category) {
      res.status(400).json({
        error: 'Title, description, and category are required'
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    // Validate category
    if (!FOUND_ITEM_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'Invalid category',
        valid_categories: FOUND_ITEM_CATEGORIES
      });
      return;
    }

    // Validate contact_method
    if (contact_method && !CONTACT_METHODS.includes(contact_method)) {
      res.status(400).json({
        error: 'Invalid contact method',
        valid_methods: CONTACT_METHODS
      });
      return;
    }

    // Handle uploaded files from multer OR images from JSON body
    let imageUrls: string[] = [];
    
    // Check if files were uploaded via FormData/multer
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        try {
          if (shouldUseImageKit() && imagekit && file.buffer) {
            const result = await imagekit.upload({
              file: file.buffer,
              fileName: `${studentId}-found-item-${Date.now()}-${file.originalname}`,
              folder: '/unyva_found_items',
            });
            imageUrls.push(result.url);
          } else {
            const filename = (file.filename as string) || file.originalname;
            imageUrls.push(getLocalUrl('found_items', filename));
          }
        } catch (uploadError) {
          console.error('⚠️ Failed to process found item image:', uploadError);
        }
      }

      console.log('📸 Uploaded file URLs:', imageUrls);
    } else if (req.body.images) {
      // Fallback: handle images from JSON body (backward compatibility)
      let images: string[];
      try {
        images = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      } catch {
        images = [req.body.images];
      }
      
      // Filter to max 3 images
      if (Array.isArray(images)) {
        imageUrls = images.slice(0, 3).filter((img: string) => img && typeof img === 'string');
      }
    }

    // Validate images array (max 3)
    if (imageUrls.length > 3) {
      res.status(400).json({
        error: 'Maximum 3 images allowed'
      });
      return;
    }

    // Validate item_date is not in the future
    if (item_date) {
      const foundDate = new Date(item_date);
      const today = new Date();
      if (foundDate > today) {
        res.status(400).json({
          error: 'Item cannot be found in the future'
        });
        return;
      }
      // Optional: warn if older than 30 days
      if ((today.getTime() - foundDate.getTime()) > 30 * 24 * 60 * 60 * 1000) {
        console.warn('Found item is older than 30 days');
      }
    }

    // Validate location_description length
    if (location_description && location_description.length > 255) {
      res.status(400).json({
        error: 'Location description cannot exceed 255 characters'
      });
      return;
    }

    // Validate contact_info format for phone/email
    if (contact_info) {
      // If contact_info is provided, contact_method must be valid
      if (!contact_method || !CONTACT_METHODS.includes(contact_method)) {
        res.status(400).json({
          error: 'Contact method is required when contact info is provided',
          valid_methods: CONTACT_METHODS
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;

      if (contact_method === 'Email' && !emailRegex.test(contact_info)) {
        res.status(400).json({
          error: 'Invalid email address'
        });
        return;
      }
      if ((contact_method === 'Call' || contact_method === 'WhatsApp') && !phoneRegex.test(contact_info)) {
        res.status(400).json({
          error: 'Invalid phone number'
        });
        return;
      }
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO found_items 
        (student_id, title, description, category, location_description, hall_id, room_number, 
         contact_method, contact_info, images, item_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active') 
       RETURNING *`,
      [
        studentId,
        title,
        description,
        category,
        location_description || null,
        hall_id || null,
        room_number || null,
        contact_method || 'in_app',
        contact_info || null,
        JSON.stringify(imageUrls),
        item_date || null
      ]
    );

    // Send GLOBAL broadcast + private confirmation
    try {
      // Notify ALL users about new found item
      await notificationService.sendBroadcastNotification({
        type: 'found_item_new',
        title: 'New Found Item Posted!',
        message: `Someone found "${title}" - check the Found Items section! 🎉`,
        data: {
          screen: 'found-items',
          found_item_id: result.rows[0].id,
          action: 'view_new'
        },
        priority: 'high',
        delivery_methods: ['push']
      });

      // Private confirmation to poster
      await notificationService.createFoundItemNotification(
        studentId,
        result.rows[0].id,
        title
      );
    } catch (notifyError) {
      console.warn('Failed to send broadcast + private notifications:', notifyError);
    }

    const normalizedCreatedItem = normalizeFoundItemForResponse(result.rows[0], req);

    console.log('✅ Found item added successfully with', imageUrls.length, 'images');
    res.status(201).json({
      success: true,
      message: 'Found item posted successfully',
      found_item: normalizedCreatedItem
    });
  } catch (err: any) {
    console.error('❌ Add Found Item Error:', err);
    res.status(500).json({
      error: 'Failed to add found item',
      message: err.message
    });
  }
};

// PUT /api/found-items/:id - Update found item
export const updateFoundItem = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    console.log('📦 Updating found item:', id);

    // Check if item exists and belongs to user
    const checkResult = await pool.query(
      'SELECT student_id, status FROM found_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: 'Found item not found'
      });
      return;
    }

    const currentItem = checkResult.rows[0];

    if (currentItem.student_id !== studentId) {
      res.status(403).json({
        error: 'You can only update your own found items'
      });
      return;
    }

    // Extract fields to update
    const {
      title,
      description,
      category,
      location_description,
      hall_id,
      room_number,
      contact_method,
      contact_info,
      images,
      item_date,
      status
    } = req.body;

    // Validate status transition if status is being updated
    if (status !== undefined && status !== currentItem.status) {
      // Can only go from active -> claimed -> resolved
      if (status === 'claimed' && currentItem.status !== 'active') {
        res.status(400).json({
          error: `Cannot move from ${currentItem.status} to claimed. Only active items can be claimed.`,
          current_status: currentItem.status
        });
        return;
      }
      if (status === 'resolved' && currentItem.status !== 'claimed') {
        res.status(400).json({
          error: `Cannot resolve. Item must be in claimed status, currently: ${currentItem.status}`,
          current_status: currentItem.status
        });
        return;
      }
      // Cannot go back from resolved
      if (currentItem.status === 'resolved') {
        res.status(400).json({
          error: 'Cannot modify resolved items',
          current_status: currentItem.status
        });
        return;
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (category !== undefined) {
      if (!FOUND_ITEM_CATEGORIES.includes(category)) {
        res.status(400).json({
          error: 'Invalid category',
          valid_categories: FOUND_ITEM_CATEGORIES
        });
        return;
      }
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (location_description !== undefined) {
      updates.push(`location_description = $${paramIndex++}`);
      values.push(location_description);
    }
    if (hall_id !== undefined) {
      updates.push(`hall_id = $${paramIndex++}`);
      values.push(hall_id);
    }
    if (room_number !== undefined) {
      updates.push(`room_number = $${paramIndex++}`);
      values.push(room_number);
    }
    if (contact_method !== undefined) {
      if (!CONTACT_METHODS.includes(contact_method)) {
        res.status(400).json({
          error: 'Invalid contact method',
          valid_methods: CONTACT_METHODS
        });
        return;
      }
      updates.push(`contact_method = $${paramIndex++}`);
      values.push(contact_method);
    }
    if (contact_info !== undefined) {
      updates.push(`contact_info = $${paramIndex++}`);
      values.push(contact_info);
    }
    if (images !== undefined) {
      if (Array.isArray(images) && images.length > 3) {
        res.status(400).json({
          error: 'Maximum 3 images allowed'
        });
        return;
      }
      updates.push(`images = $${paramIndex++}`);
      values.push(JSON.stringify(images || []));
    }
    if (item_date !== undefined) {
      updates.push(`item_date = $${paramIndex++}`);
      values.push(item_date);
    }
    if (status !== undefined) {
      if (!ITEM_STATUS.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          valid_statuses: ITEM_STATUS
        });
        return;
      }
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause
    values.push(id);

    const query = `
      UPDATE found_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    const normalizedUpdatedItem = normalizeFoundItemForResponse(result.rows[0], req);

    console.log('✅ Found item updated successfully');
    res.status(200).json({
      success: true,
      message: 'Found item updated successfully',
      found_item: normalizedUpdatedItem
    });
  } catch (err: any) {
    console.error('❌ Update Found Item Error:', err);
    res.status(500).json({
      error: 'Failed to update found item',
      message: err.message
    });
  }
};

// DELETE /api/found-items/:id - Delete found item
export const deleteFoundItem = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    console.log('🗑️ Deleting found item:', id);

    // Check if item exists and belongs to user
    const checkResult = await pool.query(
      'SELECT student_id FROM found_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: 'Found item not found'
      });
      return;
    }

    if (checkResult.rows[0].student_id !== studentId) {
      res.status(403).json({
        error: 'You can only delete your own found items'
      });
      return;
    }

    // Delete from database
    await pool.query('DELETE FROM found_items WHERE id = $1', [id]);

    console.log('✅ Found item deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Found item deleted successfully'
    });
  } catch (err: any) {
    console.error('❌ Delete Found Item Error:', err);
    res.status(500).json({
      error: 'Failed to delete found item',
      message: err.message
    });
  }
};

// GET /api/found-items/my/items - Get current user's found items
export const getMyFoundItems = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    console.log('📦 Fetching my found items:', studentId);

    const result = await pool.query(
      `SELECT 
        fi.*,
        uh.full_name as hall_name
      FROM found_items fi
      LEFT JOIN university_halls uh ON fi.hall_id = uh.id
      WHERE fi.student_id = $1
      ORDER BY fi.created_at DESC`,
      [studentId]
    );

    const normalizedItems = result.rows.map((row: any) => normalizeFoundItemForResponse(row, req));

    console.log('✅ My found items fetched successfully');
    res.status(200).json({
      success: true,
      found_items: normalizedItems
    });
  } catch (err: any) {
    console.error('❌ Get My Found Items Error:', err);
    res.status(500).json({
      error: 'Failed to fetch your found items',
      message: err.message
    });
  }
};

// POST /api/found-items/:id/claim - Mark item as claimed (for the finder to update)
export const claimFoundItem = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    console.log('📦 Marking found item as claimed:', id);

    // Check if item exists
    const checkResult = await pool.query(
      'SELECT student_id, status FROM found_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: 'Found item not found'
      });
      return;
    }

    const item = checkResult.rows[0];

    // Only the poster can mark as claimed
    if (item.student_id !== studentId) {
      res.status(403).json({
        error: 'Only the poster can mark this item as claimed'
      });
      return;
    }

    // Validate status transition: can only claim active items
    if (item.status !== 'active') {
      res.status(400).json({
        error: 'Item can only be claimed when in active status',
        current_status: item.status
      });
      return;
    }

    // Update status to claimed
    const result = await pool.query(
      `UPDATE found_items 
       SET status = 'claimed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    // Send notification to the poster
    try {
      await notificationService.createFoundItemClaimedNotification(
        studentId,
        parseInt(id),
        result.rows[0].title || 'Found Item'
      );
    } catch (notifyError) {
      console.warn('Failed to send notification:', notifyError);
    }

    const normalizedClaimedItem = normalizeFoundItemForResponse(result.rows[0], req);

    console.log('✅ Found item marked as claimed');
    res.status(200).json({
      success: true,
      message: 'Item marked as claimed. The owner has been notified.',
      found_item: normalizedClaimedItem
    });
  } catch (err: any) {
    console.error('❌ Claim Found Item Error:', err);
    res.status(500).json({
      error: 'Failed to claim found item',
      message: err.message
    });
  }
};

// POST /api/found-items/:id/resolve - Mark item as resolved (returned to owner)
export const resolveFoundItem = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    console.log('📦 Resolving found item:', id);

    // Check if item exists
    const checkResult = await pool.query(
      'SELECT student_id, status FROM found_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        error: 'Found item not found'
      });
      return;
    }

    const item = checkResult.rows[0];

    // Only the poster can mark as resolved
    if (item.student_id !== studentId) {
      res.status(403).json({
        error: 'Only the poster can mark this item as resolved'
      });
      return;
    }

    // Validate status transition: can only resolve claimed items
    if (item.status !== 'claimed') {
      res.status(400).json({
        error: 'Item can only be resolved when in claimed status',
        current_status: item.status
      });
      return;
    }

    // Update status to resolved
    const result = await pool.query(
      `UPDATE found_items 
       SET status = 'resolved', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    // Send notification to the poster
    try {
      await notificationService.createFoundItemResolvedNotification(
        studentId,
        parseInt(id),
        result.rows[0].title || 'Found Item'
      );
    } catch (notifyError) {
      console.warn('Failed to send notification:', notifyError);
    }

    const normalizedResolvedItem = normalizeFoundItemForResponse(result.rows[0], req);

    console.log('✅ Found item resolved');
    res.status(200).json({
      success: true,
      message: 'Item marked as resolved. Glad the item was returned!',
      found_item: normalizedResolvedItem
    });
  } catch (err: any) {
    console.error('❌ Resolve Found Item Error:', err);
    res.status(500).json({
      error: 'Failed to resolve found item',
      message: err.message
    });
  }
};

// GET /api/found-items/categories - Get available categories
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    categories: FOUND_ITEM_CATEGORIES
  });
};
