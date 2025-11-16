import { Request, Response } from 'express';
import { deliveryCodeManager } from '../utils/DeliveryCodeManager.js';

// GET /api/admin/delivery-codes - Get all delivery codes (Admin only)
export const getDeliveryCodes = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to access delivery codes');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    console.log('📋 Fetching delivery codes for admin...');

    const codes = await deliveryCodeManager.getAllCodes();

    console.log('✅ Delivery codes fetched successfully');
    res.status(200).json({
      success: true,
      codes: codes
    });
  } catch (err: any) {
    console.error('❌ Get Delivery Codes Error:', err);
    res.status(500).json({
      error: 'Failed to fetch delivery codes',
      message: err.message
    });
  }
};

// POST /api/admin/delivery-codes/generate - Generate new delivery codes (Admin only)
export const generateDeliveryCodes = async (req: any, res: Response): Promise<void> => {
  try {
    const { count = 5, expiresInDays = 365 } = req.body;
    const studentId = req.user?.student_id;

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to generate delivery codes');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Validate input
    if (count < 1 || count > 50) {
      res.status(400).json({
        error: 'Count must be between 1 and 50'
      });
      return;
    }

    if (expiresInDays < 1 || expiresInDays > 3650) {
      res.status(400).json({
        error: 'Expiration days must be between 1 and 3650'
      });
      return;
    }

    console.log(`🎫 Generating ${count} delivery codes for ${expiresInDays} days...`);

    const newCodes = await deliveryCodeManager.generateCodes(count, expiresInDays);

    console.log('✅ Delivery codes generated successfully');
    res.status(201).json({
      success: true,
      message: `${count} delivery codes generated successfully`,
      codes: newCodes
    });
  } catch (err: any) {
    console.error('❌ Generate Delivery Codes Error:', err);
    res.status(500).json({
      error: 'Failed to generate delivery codes',
      message: err.message
    });
  }
};

// DELETE /api/admin/delivery-codes/:code - Revoke a delivery code (Admin only)
export const revokeDeliveryCode = async (req: any, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const studentId = req.user?.student_id;

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to revoke delivery code');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    console.log('🚫 Revoking delivery code:', code);

    const success = await deliveryCodeManager.revokeCode(code);

    if (!success) {
      res.status(404).json({
        error: 'Delivery code not found or already revoked'
      });
      return;
    }

    console.log('✅ Delivery code revoked successfully');
    res.status(200).json({
      success: true,
      message: 'Delivery code revoked successfully'
    });
  } catch (err: any) {
    console.error('❌ Revoke Delivery Code Error:', err);
    res.status(500).json({
      error: 'Failed to revoke delivery code',
      message: err.message
    });
  }
};
