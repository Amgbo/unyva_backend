import { Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../db.js';
import crypto from 'crypto';

// Paystack keys from environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

export const initializePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, amount } = req.body; // amount in pesewas

    if (!email || !amount) {
      res.status(400).json({ error: 'Email and amount are required' });
      return;
    }

    // Initialize payment with Paystack
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount,
      callback_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payments/verify`,
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const { data } = response.data;

    res.json({
      authorization_url: data.authorization_url,
      access_code: data.access_code,
      reference: data.reference,
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.query;

    if (!reference || typeof reference !== 'string') {
      res.status(400).json({ error: 'Payment reference is required' });
      return;
    }

    // Verify payment with Paystack
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const { data } = response.data;

    if (data.status === 'success') {
      // Update student payment status in database using email from Paystack response
      const email = data.data.customer.email;
      const updateQuery = `
        UPDATE students
        SET paid = true, payment_date = NOW()
        WHERE email = $1
        RETURNING *;
      `;

      const result = await pool.query(updateQuery, [email]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Payment verified and student updated',
        student: result.rows[0],
        transaction: data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        transaction: data,
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const query = `
      SELECT paid, payment_date
      FROM students
      WHERE student_id = $1;
    `;

    const result = await pool.query(query, [studentId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({
      has_paid: result.rows[0].paid,
      payment_date: result.rows[0].payment_date,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse raw body for signature verification
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);

    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'] as string;

    const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      res.sendStatus(401);
      return;
    }

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const email = event.data.customer.email;

      // Update student payment status using email
      const updateQuery = `
        UPDATE students
        SET paid = true, payment_date = NOW()
        WHERE email = $1
        RETURNING *;
      `;

      const result = await pool.query(updateQuery, [email]);

      if (result.rows.length > 0) {
        console.log(`Payment confirmed for student with email ${email}`);
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
