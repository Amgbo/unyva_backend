import express, { Request, Response, NextFunction } from 'express';
import { deliveryCodeManager } from '../utils/DeliveryCodeManager.js';

const router = express.Router();

// Async handler wrapper for proper error handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Generate delivery codes (Admin endpoint)
 */
router.post('/generate-codes', asyncHandler(async (req: Request, res: Response) => {
  const { count = 5, expires_in_days = 365 } = req.body;
  
  if (count > 50) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot generate more than 50 codes at once' 
    });
  }

  try {
    const codes = await deliveryCodeManager.generateCodes(count, expires_in_days);
    
    res.status(201).json({
      success: true,
      codes: codes,
      message: `Successfully generated ${codes.length} delivery codes`
    });
  } catch (error) {
    console.error('Error in generate-codes endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate delivery codes'
    });
  }
}));

/**
 * Revoke a delivery code (Admin endpoint)
 */
router.delete('/revoke-code/:code', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Code parameter is required' 
    });
  }

  try {
    const success = await deliveryCodeManager.revokeCode(code);
    
    if (success) {
      res.json({
        success: true,
        message: `Delivery code ${code} has been revoked successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Delivery code ${code} not found`
      });
    }
  } catch (error) {
    console.error('Error in revoke-code endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke delivery code'
    });
  }
}));

/**
 * Get all delivery codes (Admin endpoint)
 */
router.get('/codes', asyncHandler(async (req: Request, res: Response) => {
  try {
    const codes = await deliveryCodeManager.getAllCodes();
    
    res.json({
      success: true,
      codes: codes,
      count: codes.length
    });
  } catch (error) {
    console.error('Error in get codes endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery codes'
    });
  }
}));

/**
 * Validate a delivery code
 */
router.get('/validate-code/:code', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Code parameter is required' 
    });
  }

  try {
    const validation = await deliveryCodeManager.validateCode(code);
    
    res.json({
      success: validation.isValid,
      isValid: validation.isValid,
      message: validation.message
    });
  } catch (error) {
    console.error('Error in validate-code endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate delivery code'
    });
  }
}));

/**
 * Check if student has delivery code
 */
router.get('/student-has-code/:studentId', asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  
  if (!studentId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Student ID parameter is required' 
    });
  }

  try {
    const hasCode = await deliveryCodeManager.hasDeliveryCode(studentId);
    
    res.json({
      success: true,
      hasCode: hasCode,
      studentId: studentId
    });
  } catch (error) {
    console.error('Error in student-has-code endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check student delivery code status'
    });
  }
}));

export default router;