# TODO: Paystack Payment Integration for Student App

## Overview
Implement complete Paystack payment integration for GH₵5.00 student login fee using student_id as unique identifier. Payment triggers automatically after login on home screen if not already paid.

## Tasks

### 1. Dependencies Installation
- [ ] Install react-native-paystack-webview: `npm install react-native-paystack-webview`
- [ ] Install @react-native-async-storage/async-storage: `npm install @react-native-async-storage/async-storage`
- [ ] Verify axios is installed (for backend API calls)
- [ ] Update package.json and ensure compatibility with Expo

### 2. Frontend Payment Logic Implementation
- [ ] Edit `unyva-frontend/app/(tabs)/home.tsx` to add payment functionality
- [ ] Add Paystack WebView component import
- [ ] Add AsyncStorage imports and usage
- [ ] Implement payment status check on component mount using `payment_${student_id}` key
- [ ] Create payment popup/modal that auto-triggers if payment not completed
- [ ] Configure payment parameters:
  - Amount: 500 pesewas (GH₵5.00)
  - Email: student's email from context/AsyncStorage
  - Reference: unique transaction reference
  - Public key: pk_test_53c8f6ef7959d1d3d9a55d6632902b43d8a91793
- [ ] Implement success handler:
  - Show success alert "✅ Payment successful!"
  - Store `payment_${student_id} = true` in AsyncStorage
  - Log transaction reference
  - Hide payment popup
- [ ] Implement cancel handler:
  - Show cancel alert "❌ Payment cancelled"
  - Hide payment popup
- [ ] Add loading states and error handling
- [ ] Ensure payment only triggers for logged-in students

### 3. AsyncStorage Logic
- [ ] Create utility functions for payment status management:
  - `checkPaymentStatus(studentId)`: Check if student has paid
  - `setPaymentStatus(studentId, status)`: Update payment status
  - `getStudentData()`: Retrieve student_id and email from storage/context
- [ ] Implement persistence across app reloads
- [ ] Add error handling for AsyncStorage operations

### 4. UI/UX Enhancements
- [ ] Add payment status indicator on home screen
- [ ] Show "Payment Required" message for unpaid students
- [ ] Show "Payment Completed" message for paid students
- [ ] Add loading spinner during payment status check
- [ ] Ensure payment popup is user-friendly and responsive

### 5. Backend Verification (Optional)
- [ ] Create new backend endpoint: `POST /api/payments/verify`
- [ ] Implement Paystack transaction verification using secret key
- [ ] Add verification logic to mark student as paid in database
- [ ] Update student model to include payment status field
- [ ] Add database migration for payment tracking

### 6. Code Quality & Testing
- [ ] Add comprehensive comments throughout the code
- [ ] Create modular functions for payment operations
- [ ] Test payment flow with test keys
- [ ] Test edge cases: network errors, payment failures, app reloads
- [ ] Ensure compatibility with different devices and screen sizes
- [ ] Add TypeScript types for payment-related interfaces

### 7. Configuration & Deployment
- [ ] Create environment variables for Paystack keys
- [ ] Add instructions for switching from test to live keys
- [ ] Update documentation with payment integration details
- [ ] Test on physical device/emulator

### 8. Optional Extensions
- [ ] Implement monthly renewal logic (payment expires after 30 days)
- [ ] Add payment history tracking
- [ ] Implement retry mechanism for failed payments
- [ ] Add email notifications for payment confirmations

## Technical Details
- **Payment Amount**: GH₵5.00 (500 pesewas)
- **Test Public Key**: pk_test_53c8f6ef7959d1d3d9a55d6632902b43d8a91793
- **Test Secret Key**: sk_test_82a3d46997cfc66e6885aa1d040c2670fb7502ac
- **Unique Identifier**: student_id
- **Storage Key**: `payment_${student_id}`
- **Trigger Point**: Home screen after login
- **Package**: react-native-paystack-webview

## Files to Modify
- `unyva-frontend/app/(tabs)/home.tsx` (main payment logic)
- `unyva-backend/src/routes/paymentRoutes.ts` (new file for verification)
- `unyva-backend/src/controllers/paymentController.ts` (new file for verification)
- `unyva-backend/src/models/studentModel.ts` (add payment status field)

## Status: Not Started
All tasks pending implementation.
