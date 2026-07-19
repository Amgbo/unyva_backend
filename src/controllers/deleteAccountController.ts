import { Request, Response } from 'express';
import { createDeleteAccountRequest, getAllDeleteAccountRequests, updateDeleteAccountRequestStatus } from '../models/deleteAccountModel.js';

export const submitDeleteAccountRequest = async (req: Request, res: Response) => {
  try {
    const { fullName, studentIdOrEmail, deletionMessage } = req.body;

    // Validate required fields
    if (!fullName || !studentIdOrEmail || !deletionMessage) {
      res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
      return;
    }

    // Save to database
    await createDeleteAccountRequest(fullName, studentIdOrEmail, deletionMessage);

    res.json({
      success: true,
      message: 'Account deletion request submitted successfully. An admin will review your request within 7-10 business days.'
    });

  } catch (error) {
    console.error('Error submitting delete account request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit request. Please try again or contact support.'
    });
  }
};


