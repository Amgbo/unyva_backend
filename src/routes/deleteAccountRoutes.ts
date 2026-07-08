import { Router } from 'express';
import { submitDeleteAccountRequest } from '../controllers/deleteAccountController.js';
import { getDeleteAccountRequestsAdmin, updateDeleteAccountRequestAdmin } from '../controllers/adminController.js';

const router = Router();

// POST /api/delete-account - Submit account deletion request
router.post('/delete-account', submitDeleteAccountRequest);

// Admin routes (authentication handled in controller)
// GET /api/admin/delete-account-requests - Get all delete account requests (Admin only)
router.get('/admin/delete-account-requests', getDeleteAccountRequestsAdmin);

// PUT /api/admin/delete-account-requests/:id/status - Update delete account request status (Admin only)
router.put('/admin/delete-account-requests/:id/status', updateDeleteAccountRequestAdmin);

export { router as deleteAccountRouter };
