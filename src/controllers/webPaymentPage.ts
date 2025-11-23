import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import axios from 'axios';

const router = express.Router();

// Serve the static HTML payment page
router.get('/payment-page', (req: Request, res: Response, next: NextFunction): void => {
  res.sendFile(path.resolve(__dirname, '../../web-payment/payment.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

// Endpoint to verify payment after checkout
router.post('/verify-payment', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reference, student_id } = req.body;

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

    const verifyResponse = await axios.get(\`https://api.paystack.co/transaction/verify/\${reference}\`, {
      headers: {
        Authorization: \`Bearer \${PAYSTACK_SECRET_KEY}\`,
        'Content-Type': 'application/json',
      },
    });

    const { data } = verifyResponse.data;

    if (data.status === 'success' && data.metadata?.student_id === student_id) {
      // Consider payment successful, you might insert DB updates here or notify app via webhook
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
