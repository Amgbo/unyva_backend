# Payment Integration Tests

This directory contains integration tests for the Paystack payment system.

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest typescript
npm install --save-dev @testing-library/node
```

### 2. Configure Jest (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### 3. Update tsconfig.json

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "types": ["jest", "node"]
  }
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run payment tests only
npm test -- payment.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Coverage

The payment tests cover:

- ✅ `verifyPayment` with valid Paystack response
- ✅ `verifyPayment` with amount mismatch (rejected)
- ✅ `verifyPayment` with metadata mismatch (rejected)
- ✅ `verifyPayment` with missing reference
- ✅ `verifyPayment` with missing student_id
- ✅ `handleWebhook` with valid signature
- ✅ `handleWebhook` with invalid signature
- ✅ `handleWebhook` with missing signature
- ✅ `handleWebhook` with missing webhook secret
- ✅ `getPaymentStatus` for paid student
- ✅ `getPaymentStatus` for expired payment (> 30 days)
- ✅ `getPaymentStatus` for unpaid student
- ✅ `getPaymentStatus` for non-existent student

## Manual Testing

For manual webhook testing, use the TypeScript test script:

```bash
# Test with default settings
npx ts-node test-webhook.ts

# Test with custom parameters
npx ts-node test-webhook.ts http://localhost:5000/api/payments/webhook STU123 500

# Run multiple scenarios
npx ts-node test-webhook.ts http://localhost:5000/api/payments/webhook STU123 500 --test-scenarios
```

## Environment Setup for Tests

Set environment variables before running tests:

```bash
export PAYSTACK_SECRET_KEY="sk_test_xxxx"
export PAYSTACK_WEBHOOK_SECRET="whsec_test_xxxx"
export PAYMENT_AMOUNT_PESAWAS="500"
npm test
```

## Troubleshooting

### Issue: `Cannot find module` errors

**Solution:** Ensure paths in tsconfig.json match your project structure and Jest config includes proper moduleNameMapper.

### Issue: Database connection timeouts in tests

**Solution:** Mock the database (`pool`) completely. Tests should not connect to real database.

### Issue: Paystack API errors in tests

**Solution:** All tests mock axios. Ensure `jest.mock('axios')` is at the top of test files.
