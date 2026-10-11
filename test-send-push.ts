import { NotificationService } from './src/services/notificationService';
import { pool } from './src/db';

async function testSendPush() {
  try {
    console.log('🧪 Test send push notification');

    // Find a user with a push token
    const res = await pool.query(`SELECT student_id, push_token, email FROM students WHERE push_token IS NOT NULL LIMIT 1`);
    if (res.rows.length === 0) {
      console.log('❌ No users with a push token found in the database. Register a push token first.');
      return;
    }

    const user = res.rows[0];
    console.log(`Found user: ${user.email} (ID: ${user.student_id}) with token: ${user.push_token}`);

    const service = new NotificationService();

    const notificationData = {
      user_id: String(user.student_id),
      type: 'message',
      title: 'Test Push',
      message: 'This is a test push with sound: default',
      data: { test: true },
      priority: 'high',
      delivery_methods: ['push'],
    } as any;

    const created = await service.createAndSend(notificationData);
    console.log('✅ Notification created and send initiated:', created.id);

  } catch (e) {
    console.error('❌ Error sending test push:', e);
  } finally {
    await pool.end();
  }
}

void testSendPush();
