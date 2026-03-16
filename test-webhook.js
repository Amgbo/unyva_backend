const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = process.argv[2] || 'http://localhost:5000/api/payments/webhook';
const STUDENT_ID = process.argv[3] || '12345';
const AMOUNT = Number(process.argv[4] || 500);
const WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || 'test-secret-key';

function createPayload() {
  const reference = `unyva_${STUDENT_ID}_${Date.now()}`;
  return {
    event: 'charge.success',
    data: {
      id: Math.floor(Math.random() * 1e9),
      reference,
      amount: AMOUNT,
      paid_at: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      status: 'success',
      customer: {
        id: Math.floor(Math.random() * 1e6),
        email: `student${STUDENT_ID}@example.com`,
        customer_code: `CUS_${Math.random().toString(36).substring(2, 11)}`,
        first_name: 'Test',
        last_name: 'Student',
      },
      metadata: {
        student_id: String(STUDENT_ID),
        custom_fields: [
          { display_name: 'Student Name', variable_name: 'student_name', value: 'Test Student' }
        ]
      }
    }
  };
}

function sign(body) {
  return crypto.createHmac('sha512', WEBHOOK_SECRET).update(body).digest('hex');
}

(async function main() {
  try {
    const payload = createPayload();
    const body = JSON.stringify(payload);
    const sig = sign(body);

    console.log('Posting to', WEBHOOK_URL);
    const res = await axios.post(WEBHOOK_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': sig,
      },
      validateStatus: () => true,
    });

    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
