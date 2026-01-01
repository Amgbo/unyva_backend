import { NotificationService } from './src/services/notificationService';
import { pool } from './src/db';

async function testPushTokenRegistration() {
  try {
    console.log('🧪 Testing Push Token Registration');

    const notificationService = new NotificationService();

    // Get a test user (first user in database)
    const users = await pool.query(`
      SELECT student_id, email
      FROM students
      LIMIT 1
    `);

    if (users.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const testUser = users.rows[0];
    console.log(`👤 Testing with user: ${testUser.email} (ID: ${testUser.student_id})`);

    // Test with a valid Expo push token format
    const validPushToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

    console.log('📝 Registering valid push token...');
    await notificationService.registerPushToken(testUser.student_id, validPushToken);
    console.log('✅ Valid push token registered successfully');

    // Verify it was saved
    const updatedUser = await pool.query(`
      SELECT push_token FROM students WHERE student_id = $1
    `, [testUser.student_id]);

    console.log('💾 Saved push token:', updatedUser.rows[0].push_token);

    // Test with invalid token
    console.log('\n❌ Testing invalid push token...');
    try {
      await notificationService.registerPushToken(testUser.student_id, 'invalid-token');
      console.log('⚠️ This should have failed!');
    } catch (error) {
      console.log('✅ Correctly rejected invalid token:', (error as Error).message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error as Error);
  } finally {
    await pool.end();
  }
}

// Run the test
testPushTokenRegistration().catch(console.error);
