import { pool } from './db.js';

async function checkDeliveryUsers() {
  try {
    console.log('Checking delivery users in database...');

    // Check all users with delivery role
    const deliveryUsers = await pool.query(
      'SELECT student_id, first_name, last_name, role, is_delivery_approved FROM students WHERE role = $1',
      ['delivery']
    );

    console.log('Delivery users found:', deliveryUsers.rows.length);
    deliveryUsers.rows.forEach((user: any) => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.student_id}): role=${user.role}, approved=${user.is_delivery_approved}`);
    });

    // Check all users who are delivery approved
    const approvedUsers = await pool.query(
      'SELECT student_id, first_name, last_name, role, is_delivery_approved FROM students WHERE is_delivery_approved = $1',
      [true]
    );

    console.log('\nDelivery approved users:', approvedUsers.rows.length);
    approvedUsers.rows.forEach((user: any) => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.student_id}): role=${user.role}, approved=${user.is_delivery_approved}`);
    });

    // Check if there are any deliveries assigned
    const deliveries = await pool.query(
      'SELECT id, delivery_person_id, status FROM deliveries LIMIT 10'
    );

    console.log('\nRecent deliveries:', deliveries.rows.length);
    deliveries.rows.forEach((delivery: any) => {
      console.log(`- Delivery ${delivery.id}: assigned to ${delivery.delivery_person_id}, status=${delivery.status}`);
    });

  } catch (error) {
    console.error('Error checking delivery users:', error);
  } finally {
    pool.end();
  }
}

checkDeliveryUsers();
