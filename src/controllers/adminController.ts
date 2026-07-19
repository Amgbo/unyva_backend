import { Request, Response } from 'express';
import { deliveryCodeManager } from '../utils/DeliveryCodeManager.js';
import { getAllDeleteAccountRequests, updateDeleteAccountRequestStatus } from '../models/deleteAccountModel.js';

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

// GET /api/admin/delete-account-requests - Get all delete account requests (Admin only)
export const getDeleteAccountRequestsAdmin = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to access delete account requests');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    console.log('📋 Fetching delete account requests for admin...');

    const requests = await getAllDeleteAccountRequests();

    console.log('✅ Delete account requests fetched successfully');
    res.status(200).json({
      success: true,
      requests: requests
    });
  } catch (err: any) {
    console.error('❌ Get Delete Account Requests Error:', err);
    res.status(500).json({
      error: 'Failed to fetch delete account requests',
      message: err.message
    });
  }
};

// PUT /api/admin/delete-account-requests/:id/status - Update delete account request status (Admin only)
export const updateDeleteAccountRequestAdmin = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const studentId = req.user?.student_id;

    // Check if user is admin (student_id '22243185')
    if (studentId !== '22243185') {
      console.log('❌ Access denied: Non-admin user attempted to update delete account request');
      res.status(403).json({
        error: 'Access denied. Admin privileges required.'
      });
      return;
    }

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({
        error: 'Invalid status. Must be pending, approved, or rejected.'
      });
      return;
    }

    console.log(`🔄 Updating delete account request ${id} to status: ${status}`);
  // If status is approved, actually delete the student account if (status === 'approved') { console.log(`🗑️ Deleting student account for request ${id}: ${updatedRequest.student_id_or_email}`);  try { // Try to find the student by student_id first, then by email let studentToDelete = updatedRequest.student_id_or_email;  // If it looks like an email, we need to find the student_id if (studentToDelete.includes('@')) { // This is a simplified approach - in production you'd query the database // For now, we'll assume the student_id_or_email field contains the student_id console.log('⚠️ Email-based deletion not fully implemented - assuming student_id_or_email contains student_id'); }  const deletionSuccess = await deleteStudentAccount(studentToDelete);  if (deletionSuccess) { console.log(`✅ Student account ${studentToDelete} deleted successfully`);  // Delete the request record itself await deleteDeleteAccountRequest(parseInt(id)); console.log(`🗑️ Delete account request ${id} cleaned up`); } else { console.log(`❌ Failed to delete student account ${studentToDelete}`); // Don't fail the whole operation, but log the issue } } catch (deleteError) { console.error('❌ Error during account deletion:', deleteError); // Don't fail the whole operation for account deletion errors } }

    const updatedRequest = await updateDeleteAccountRequestStatus(parseInt(id), status);

    if (!updatedRequest) {
      res.status(404).json({
        error: 'Delete account request not found'
      });
      return;
    }

    console.log('✅ Delete account request updated successfully');
    res.status(200).json({
      success: true,
      message: 'Delete account request updated successfully',
      request: updatedRequest
    });
  } catch (err: any) {
    console.error('❌ Update Delete Account Request Error:', err);
    res.status(500).json({
      error: 'Failed to update delete account request',
      message: err.message
    });
  }
};
