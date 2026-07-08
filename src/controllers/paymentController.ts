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
    const { email, amount, student_id } = req.body; // amount in pesewas

    if (!email || !amount) {
      console.warn('❌ Payment init failed: missing email or amount');
      res.status(400).json({ error: 'Email and amount are required' });
      return;
    }

    console.log(`📍 Initializing payment - student: ${student_id}, email: ${email}, amount: ${amount} pesewas`);

    // Initialize payment with Paystack
    const baseUrl = process.env.BASE_URL || (process.env.NODE_ENV === 'production'
      ? 'https://unyva.up.railway.app'
      : 'http://localhost:5000');

    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount,
      callback_url: `${baseUrl}/payment-success`,
      metadata: {
        student_id,
      },
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const { data } = response.data;

    console.log(`✅ Payment init success - ref: ${data.reference}, student: ${student_id}`);

    res.json({
      authorization_url: data.authorization_url,
      access_code: data.access_code,
      reference: data.reference,
    });
  } catch (error) {
    console.error(`❌ Payment initialization error for student ${req.body.student_id}:`, error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference, student_id } = req.body;

    if (!reference || typeof reference !== 'string') {
      console.warn(`❌ Verify payment failed: missing reference for student ${student_id}`);
      res.status(400).json({ error: 'Payment reference is required' });
      return;
    }

    if (!student_id) {
      console.warn('❌ Verify payment failed: missing student_id');
      res.status(400).json({ error: 'Student ID is required' });
      return;
    }

    console.log(`📍 Verifying payment - student: ${student_id}, reference: ${reference}`);

    // Special handling for admin (student_id: 22243185) - always consider as paid
    if (student_id === '22243185') {
      console.log(`✅ Admin account detected (${student_id}) - payment not required`);
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
      // Additional safety checks: ensure the transaction amount and metadata match expectations
      const EXPECTED_AMOUNT = Number(process.env.PAYMENT_AMOUNT_PESAWAS || '500'); // default 500 pesewas = GH¢5

      // Normalize amount from Paystack (may be string or number, and sometimes scaled)
      const txnAmount = Number(data.amount);
      if (Number.isNaN(txnAmount)) {
        console.warn(`❌ Unable to parse transaction amount - student: ${student_id}, ref: ${reference}, raw: ${data.amount}`);
        res.status(400).json({ success: false, message: 'Invalid transaction amount', transaction: data });
        return;
      }

      // Accept either exact match in pesewas, or match when scaled (defensive)
      const amountMatches = txnAmount === EXPECTED_AMOUNT || txnAmount === EXPECTED_AMOUNT * 100;
      if (!amountMatches) {
        console.warn(`❌ Amount mismatch - student: ${student_id}, ref: ${reference}, expected: ${EXPECTED_AMOUNT} (or ${EXPECTED_AMOUNT * 100}), got: ${txnAmount}`);
        res.status(400).json({ success: false, message: 'Payment amount does not match expected value', transaction: data });
        return;
      }

      // Ensure metadata.student_id (if provided by Paystack) matches the supplied student_id
      const metadataStudentId = data.metadata?.student_id ?? data.metadata?.studentId ?? null;
      if (metadataStudentId && String(metadataStudentId) !== String(student_id)) {
        console.warn(`❌ Metadata mismatch - student: ${student_id}, ref: ${reference}, metadata student_id: ${metadataStudentId}`);
        res.status(400).json({ success: false, message: 'Payment metadata student_id mismatch', transaction: data });
        return;
      }

      // Use transaction to prevent race conditions
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if already paid to prevent duplicate updates
        // Coerce student_id to string to avoid type mismatches between metadata and DB
        const checkQuery = `SELECT has_paid FROM students WHERE student_id = $1 FOR UPDATE;`;
        const checkResult = await client.query(checkQuery, [String(student_id)]);

        if (checkResult.rows.length === 0) {
          await client.query('ROLLBACK');
          console.error(`❌ Student not found - student: ${student_id}, ref: ${reference}`);
          res.status(404).json({ error: 'Student not found' });
          return;
        }

        if (checkResult.rows[0].has_paid) {
          await client.query('COMMIT');
          console.log(`⚠️  Payment already verified - student: ${student_id}, ref: ${reference}`);
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

        const result = await client.query(updateQuery, [String(student_id)]);
        await client.query('COMMIT');

        console.log(`✅ Payment verified and updated - student: ${student_id}, ref: ${reference}, amount: ${data.amount} pesewas`);

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
    console.error(`❌ Payment verification error - student: ${req.body.student_id}, ref: ${req.body.reference}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    console.log(`📍 Checking payment status - student: ${studentId}`);

    // Special handling for admin - always consider as paid
    if (studentId === '22243185') {
      console.log(`✅ Admin account detected (${studentId}) - payment not required`);
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
      console.warn(`❌ Student not found - student: ${studentId}`);
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
        console.log(`⚠️  Payment expired - student: ${studentId}, paid on: ${payment_date}, ${daysDifference} days ago`);
        isPaymentValid = false;
      }
    }

    const daysRemaining = has_paid && payment_date ? Math.max(0, 30 - Math.floor((new Date().getTime() - new Date(payment_date).getTime()) / (1000 * 60 * 60 * 24))) : 0;
    console.log(`✅ Payment status - student: ${studentId}, paid: ${isPaymentValid}, days_remaining: ${daysRemaining}`);

    res.json({
      has_paid: isPaymentValid,
      payment_date: payment_date,
      days_remaining: daysRemaining,
    });
  } catch (error) {
    console.error(`❌ Get payment status error - student: ${req.params.studentId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Safely obtain raw body for signature verification. The webhook route is
    // mounted with express.raw so req.body should be a Buffer, but guard
    // against other cases to avoid crashes.
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString()
      : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.error('❌ Failed to parse webhook JSON:', err);
      res.status(400).json({ error: 'Invalid JSON payload' });
      return;
    }

    // Ensure webhook secret is configured
    if (!PAYSTACK_WEBHOOK_SECRET) {
      console.error('PAYSTACK_WEBHOOK_SECRET is not configured. Rejecting webhook.');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    // Verify webhook signature
    const signature = (req.headers['x-paystack-signature'] || req.headers['x-paystack_signature']) as string | undefined;
    if (!signature) {
      console.warn('Missing Paystack signature header');
      res.sendStatus(401);
      return;
    }

    const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.warn('Invalid Paystack webhook signature');
      res.sendStatus(401);
      return;
    }

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const email = event.data?.customer?.email || null;
      const rawStudentId = event.data?.metadata?.student_id ?? event.data?.metadata?.studentId ?? null;
      const studentId = rawStudentId ? String(rawStudentId) : null;

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
        params = [String(studentId)];
      } else {
        checkQuery = `SELECT has_paid FROM students WHERE email = $1;`;
        updateQuery = `
          UPDATE students
          SET has_paid = true, payment_date = NOW()
          WHERE email = $1
          RETURNING *;
        `;
        params = [String(email)];
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
