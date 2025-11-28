import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Serve the static HTML payment page
 * Correct route to serve on `/api/payments/external/payment-page`
 */
router.get('/payment-page', (req: Request, res: Response, next: NextFunction): void => {
  const filePath = path.resolve(__dirname, '../../web-payment/payment.html');
  res.sendFile(filePath, (err: Error) => {
    if (err) {
      next(err);
    }
  });
});

// Endpoint to verify payment after checkout
router.post('/verify-payment', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Explicitly type req.body
    const { reference, student_id } = req.body as { reference?: string; student_id?: string };

    if (!reference || !student_id) {
      res.status(400).json({ error: 'Missing payment reference or student ID' });
      return;
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY) {
      console.error('Paystack secret key not configured.');
      res.status(500).json({ error: 'Payment configuration not available' });
      return;
    }

    const verifyResponse = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const { data } = verifyResponse.data;

    if (data.status === 'success' && data.metadata?.student_id === student_id) {
      // Payment successful
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed', transaction: data });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    next(error);
  }
});

export default router;
