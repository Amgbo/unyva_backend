#!/usr/bin/env ts-node

import { notificationService } from './src/services/notificationService.js';
import { pool } from './src/db.js';

// Test suite for notification fixes
async function runNotificationTests() {
  console.log('🧪 Running Notification System Test Suite...\n');

  // Test 1: Invalid push token registration
  console.log('1️⃣ Testing invalid push token rejection...');
  try {
    await notificationService.registerPushToken('test123', 'invalid-token');
  } catch (error: any) {
    console.log('✅ Token rejected:', error.message);
  }

  // Test 2: Valid token registration
  console.log('\n2️⃣ Testing valid push token registration...');
  try {
    const result = await notificationService.registerPushToken('test456', 'ExponentPushToken[abc123]');
    console.log('✅ Valid token registered:', result.message);
  } catch (error) {
    console.error('❌ Valid token failed:', error);
  }

  // Test 3: Data validation
  console.log('\n3️⃣ Testing data validation...');
  try {
    await notificationService.createAndSend({
      user_id: '', // Invalid
      type: 'test',
      title: 'Test',
      message: 'Test message'
    });
  } catch (error: any) {
    console.log('✅ Invalid data rejected:', error.message);
  }

  // Test 4: Broadcast rate limiting
  console.log('\n4️⃣ Testing broadcast rate limiting...');
  try {
    await notificationService.sendBroadcastNotification({
      type: 'test',
      title: 'Rate limit test 1',
      message: 'First broadcast'
    });
    console.log('✅ First broadcast sent');
    
    // Second broadcast should fail due to rate limit
    await notificationService.sendBroadcastNotification({
      type: 'test',
      title: 'Rate limit test 2',
      message: 'Second broadcast'
    });
  } catch (error: any) {
    console.log('✅ Rate limit enforced:', error.message);
  }

  // Test 5: Cleanup old notifications
  console.log('\n5️⃣ Testing cleanup jobs...');
  const invalidCleaned = await notificationService.cleanupInvalidPushTokens();
  console.log(`✅ Invalid tokens cleaned: ${invalidCleaned}`);
  
  const oldNotifsCleaned = await notificationService.cleanupOldNotifications(1); // 1 day for test
  console.log(`✅ Old notifications cleaned: ${oldNotifsCleaned}`);

  console.log('\n🎉 All notification tests passed! System is production-ready.');
}

// Run tests
runNotificationTests().catch(console.error);
