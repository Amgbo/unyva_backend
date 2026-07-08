/**
 * Webhook Test Script for Paystack Payment Integration (TypeScript)
 * 
 * Usage:
 *   npx ts-node test-webhook.ts [webhook-url] [student-id] [amount]
 * 
 * Example:
 *   npx ts-node test-webhook.ts http://localhost:5000/api/payments/webhook 12345 500
 * 
 * Prerequisites:
 *   1. Backend server must be running
 *   2. PAYSTACK_WEBHOOK_SECRET must be set in backend .env
 *   3. Run: npm install --save-dev ts-node typescript @types/node
 *   4. Run: npm install crypto axios
 */

import crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface PaystackCustomer {
  id: number;
  email: string;
  customer_code: string;
  first_name: string;
  last_name: string;
}

interface PaystackMetadata {
  student_id: string;
  custom_fields?: Array<{
    display_name: string;
    variable_name: string;
    value: string;
  }>;
}

interface PaystackTransactionData {
  id: number;
  reference: string;
  amount: number;
  paid_at: string;
  paidAt: string;
  status: string;
  customer: PaystackCustomer;
  metadata: PaystackMetadata;
}

interface PaystackWebhookPayload {
  event: string;
  data: PaystackTransactionData;
}

interface SignedPayload {
  body: string;
  hash: string;
}

interface WebhookTestScenario {
  name: string;
  studentId: string;
  shouldPass: boolean;
  wrongSecret?: boolean;
}

interface WebhookResponse {
  status: number;
  data: any;
}

// ============================================================================
// Configuration
// ============================================================================

const CLI_ARGS = process.argv.slice(2);
const WEBHOOK_URL: string = CLI_ARGS[0] || 'http://localhost:5000/api/payments/webhook';
const STUDENT_ID: string = CLI_ARGS[1] || '12345';
const AMOUNT: number = parseInt(CLI_ARGS[2] || '500', 10);
const WEBHOOK_SECRET: string = process.env.PAYSTACK_WEBHOOK_SECRET || 'test-secret-key';

// ============================================================================
// Console Utilities
// ============================================================================

const log = {
  header: (msg: string): void => {
    console.log(`\n🔧 ${msg}\n`);
  },
  section: (msg: string): void => {
    console.log(`\n📋 ${msg}`);
    console.log('-'.repeat(60));
  },
  info: (msg: string, indent: number = 0): void => {
    console.log(`${'  '.repeat(indent)}  ${msg}`);
  },
  success: (msg: string): void => {
    console.log(`✅ ${msg}`);
  },
  warning: (msg: string): void => {
    console.log(`⚠️  ${msg}`);
  },
  error: (msg: string): void => {
    console.log(`❌ ${msg}`);
  },
  debug: (msg: string, data: any): void => {
    console.log(`🔍 ${msg}`);
    console.log(JSON.stringify(data, null, 2));
  },
};

// ============================================================================
// Webhook Payload Generation
// ============================================================================

/**
 * Generate a mocked Paystack webhook payload matching the real Paystack format
 */
function createWebhookPayload(): { payload: PaystackWebhookPayload; reference: string } {
  const reference: string = `unyva_${STUDENT_ID}_${Date.now()}`;
  
  const payload: PaystackWebhookPayload = {
    event: 'charge.success',
    data: {
      id: Math.floor(Math.random() * 1000000000),
      reference,
      amount: AMOUNT,
      paid_at: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      status: 'success',
      customer: {
        id: Math.floor(Math.random() * 1000000),
        email: `student${STUDENT_ID}@example.com`,
        customer_code: `CUS_${Math.random().toString(36).substring(2, 11)}`,
        first_name: 'Test',
        last_name: 'Student',
      },
      metadata: {
        student_id: STUDENT_ID,
        custom_fields: [
          {
            display_name: 'Student Name',
            variable_name: 'student_name',
            value: 'Test Student',
          },
        ],
      },
    },
  };

  return { payload, reference };
}

// ============================================================================
// Signature Generation
// ============================================================================

/**
 * Compute the HMAC-SHA512 signature for the webhook payload
 * This matches Paystack's signature format for webhook verification
 */
function signPayload(payload: PaystackWebhookPayload, secret: string): SignedPayload {
  const body: string = JSON.stringify(payload);
  const hash: string = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');
  
  return { body, hash };
}

// ============================================================================
// Webhook Sending
// ============================================================================

/**
 * Send a single webhook to the backend and display results
 */
async function sendWebhook(): Promise<void> {
  try {
    const { payload, reference } = createWebhookPayload();
    const { body, hash } = signPayload(payload, WEBHOOK_SECRET);

    log.header('Paystack Webhook Test');
    
    log.info(`Webhook URL: ${WEBHOOK_URL}`);
    log.info(`Student ID: ${STUDENT_ID}`);
    log.info(`Amount: ${AMOUNT} pesewas (GH₵${(AMOUNT / 100).toFixed(2)})`);
    log.info(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
    log.info(`Reference: ${reference}`);

    log.section('Sending webhook payload');
    log.info(`Amount: ${AMOUNT} pesewas`, 0);
    log.info(`Signature: ${hash.substring(0, 20)}...`, 0);

    const response: AxiosResponse = await axios.post(WEBHOOK_URL, body, {
      headers: {
        'x-paystack-signature': hash,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status code
    });

    log.section('Response');
    log.info(`Status: ${response.status}`, 0);
    log.info(`Data: ${JSON.stringify(response.data, null, 2)}`, 0);

    // Evaluate response
    evaluateResponse(response.status, WEBHOOK_SECRET);
  } catch (error) {
    handleWebhookError(error);
  }
}

/**
 * Evaluate the webhook response and provide guidance
 */
function evaluateResponse(status: number, secret: string): void {
  log.section('Evaluation');

  if (status === 200) {
    log.success('Webhook accepted successfully!');
    log.info('Next steps:', 0);
    log.info(`1. Check backend logs for payment processing details`, 1);
    log.info(`2. Query database: SELECT * FROM students WHERE student_id = '${STUDENT_ID}';`, 1);
    log.info(`3. Verify has_paid and payment_date columns are updated`, 1);
  } else if (status === 401) {
    log.error('Webhook signature verification failed!');
    log.info('Troubleshooting:', 0);
    log.info(`1. Verify PAYSTACK_WEBHOOK_SECRET matches between backend and test`, 1);
    log.info(`2. Check backend logs for signature mismatch details`, 1);
    log.info(`3. Ensure backend .env has PAYSTACK_WEBHOOK_SECRET set`, 1);
    log.info(`4. Current secret (first 10 chars): ${secret.substring(0, 10)}...`, 1);
  } else if (status === 500) {
    log.warning(`Webhook returned status ${status}`);
    log.info('Troubleshooting:', 0);
    log.info(`1. Check backend logs for detailed error information`, 1);
    log.info(`2. Verify webhook URL and backend are running`, 1);
    log.info(`3. Check request body format matches Paystack spec`, 1);
  } else {
    log.warning(`Webhook returned status ${status}`);
    log.info('Troubleshooting:', 0);
    log.info(`1. Check backend console output for errors`, 1);
    log.info(`2. Verify database connectivity`, 1);
  }
}

/**
 * Handle errors when sending webhook
 */
function handleWebhookError(error: any): void {
  log.error('Error sending webhook:');
  log.info(`${error.message || 'Unknown error'}`, 0);

  log.section('Troubleshooting');
  log.info(`1. Ensure backend is running at: ${WEBHOOK_URL.split('/api')[0]}`, 0);
  log.info(`2. Check firewall/network settings`, 0);
  log.info(`3. Verify webhook URL is accessible`, 0);
  log.info(`4. Try: curl -X GET ${WEBHOOK_URL.split('/api')[0]}/api/test`, 0);

  process.exit(1);
}

// ============================================================================
// Multi-Scenario Testing
// ============================================================================

/**
 * Test multiple webhook scenarios to verify robustness
 */
async function testMultipleScenarios(): Promise<void> {
  log.header('Paystack Webhook Multi-Scenario Test');

  const scenarios: WebhookTestScenario[] = [
    {
      name: 'Valid webhook with correct signature',
      studentId: STUDENT_ID,
      shouldPass: true,
    },
    {
      name: 'Webhook with incorrect signature (wrong secret)',
      studentId: STUDENT_ID,
      shouldPass: false,
      wrongSecret: true,
    },
    {
      name: 'Valid webhook with different student ID',
      studentId: '99999',
      shouldPass: true,
    },
    {
      name: 'Valid webhook with admin student ID',
      studentId: '22243185',
      shouldPass: true,
    },
  ];

  let passed: number = 0;
  let failed: number = 0;

  for (const scenario of scenarios) {
    log.section(scenario.name);

    try {
      const { payload } = createWebhookPayload();
      payload.data.metadata.student_id = scenario.studentId;

      const secret: string = scenario.wrongSecret ? 'wrong-secret-key' : WEBHOOK_SECRET;
      const { body, hash } = signPayload(payload, secret);

      const response: AxiosResponse = await axios.post(WEBHOOK_URL, body, {
        headers: {
          'x-paystack-signature': hash,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      });

      const expectedResult: boolean = scenario.shouldPass ? response.status === 200 : response.status !== 200;

      if (expectedResult) {
        log.success(`PASS: Webhook handled as expected (status ${response.status})`);
        passed++;
      } else {
        log.error(`FAIL: Expected different result (status ${response.status})`);
        failed++;
      }
    } catch (error) {
      log.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  log.section('Test Summary');
  log.info(`Passed: ${passed}/${scenarios.length}`, 0);
  log.info(`Failed: ${failed}/${scenarios.length}`, 0);

  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

(async (): Promise<void> => {
  try {
    // Check if --test-scenarios flag is passed
    if (process.argv.includes('--test-scenarios')) {
      await testMultipleScenarios();
    } else {
      await sendWebhook();
    }
  } catch (error) {
    log.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();

export { PaystackWebhookPayload, PaystackTransactionData, WebhookTestScenario };
