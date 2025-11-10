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
    const { reference, student_id } = req.body;

    if (!reference || typeof reference !== 'string') {
      res.status(400).json({ error: 'Payment reference is required' });
      return;
    }

    if (!student_id) {
      res.status(400).json({ error: 'Student ID is required' });
      return;
    }

    // Special handling for admin (student_id: 22243185) - always consider as paid
    if (student_id === '22243185') {
      res.json({
        success: true,
        message: 'Admin account - payment not required',
        student_id,
        is_admin: true,
      });
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
      // Use transaction to prevent race conditions
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if already paid to prevent duplicate updates
        const checkQuery = `SELECT has_paid FROM students WHERE student_id = $1 FOR UPDATE;`;
        const checkResult = await client.query(checkQuery, [student_id]);

        if (checkResult.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Student not found' });
          return;
        }

        if (checkResult.rows[0].has_paid) {
          await client.query('COMMIT');
          res.json({
            success: true,
            message: 'Payment already verified',
            student_id,
            transaction: data,
          });
          return;
        }

        // Update student payment status in database using student_id
        const updateQuery = `
          UPDATE students
          SET has_paid = true, payment_date = NOW()
          WHERE student_id = $1
          RETURNING *;
        `;

        const result = await client.query(updateQuery, [student_id]);
        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Payment verified and student updated',
          student: result.rows[0],
          transaction: data,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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

    // Special handling for admin - always consider as paid
    if (studentId === '22243185') {
      res.json({
        has_paid: true,
        payment_date: null,
        is_admin: true,
      });
      return;
    }

    const query = `
      SELECT has_paid, payment_date
      FROM students
      WHERE student_id = $1;
    `;

    const result = await pool.query(query, [studentId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const { has_paid, payment_date } = result.rows[0];

    // Check if payment is within 30 days
    let isPaymentValid = has_paid;
    if (has_paid && payment_date) {
      const paymentDate = new Date(payment_date);
      const currentDate = new Date();
      const daysDifference = Math.floor((currentDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

      // If more than 30 days have passed, payment is no longer valid
      if (daysDifference > 30) {
        isPaymentValid = false;
      }
    }

    res.json({
      has_paid: isPaymentValid,
      payment_date: payment_date,
      days_remaining: has_paid && payment_date ? Math.max(0, 30 - Math.floor((new Date().getTime() - new Date(payment_date).getTime()) / (1000 * 60 * 60 * 24))) : 0,
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
      const studentId = event.data.metadata?.student_id;

      // Skip webhook processing for admin
      if (studentId === '22243185') {
        console.log('Admin account detected in webhook - skipping payment update');
        res.status(200).json({ status: 'success', message: 'Admin account - no payment update needed' });
        return;
      }

      let checkQuery, updateQuery, params;
      if (studentId) {
        checkQuery = `SELECT has_paid FROM students WHERE student_id = $1;`;
        updateQuery = `
          UPDATE students
          SET has_paid = true, payment_date = NOW()
          WHERE student_id = $1
          RETURNING *;
        `;
        params = [studentId];
      } else {
        checkQuery = `SELECT has_paid FROM students WHERE email = $1;`;
        updateQuery = `
          UPDATE students
          SET has_paid = true, payment_date = NOW()
          WHERE email = $1
          RETURNING *;
        `;
        params = [email];
      }

      // Use transaction to prevent race conditions
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if already paid to prevent duplicate updates
        const checkResult = await client.query(checkQuery, params);

        if (checkResult.rows.length === 0) {
          console.log(`Student not found for ${studentId ? 'student_id' : 'email'} ${params[0]}`);
          await client.query('COMMIT');
          res.status(200).json({ status: 'success', message: 'Student not found' });
          return;
        }

        if (checkResult.rows[0].has_paid) {
          console.log(`Payment already confirmed for ${studentId ? 'student_id' : 'email'} ${params[0]}`);
          await client.query('COMMIT');
          res.status(200).json({ status: 'success', message: 'Payment already confirmed' });
          return;
        }

        const result = await client.query(updateQuery, params);
        await client.query('COMMIT');

        if (result.rows.length > 0) {
          console.log(`Payment confirmed via webhook for ${studentId ? 'student_id' : 'email'} ${params[0]}`);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
