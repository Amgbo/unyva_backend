import { pool } from './src/db.ts';

async function testQuery() {
  try {
    console.log('Testing getServiceReviews query...\n');
    
    // Test with service_id = 1
    const serviceId = 1;
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const topLevelQuery = `
      SELECT
        sr.id,
        sr.service_id,
        sr.booking_id,
        sr.customer_id,
        sr.provider_id,
        sr.rating,
        sr.title,
        sr.comment,
        sr.is_verified,
        sr.created_at,
        sr.parent_id,
        sr.depth,
        sr.thread_root_id,
        s.first_name || ' ' || s.last_name as customer_name,
        s.profile_picture as customer_avatar
      FROM service_reviews sr
      LEFT JOIN students s ON sr.customer_id = s.student_id
      WHERE sr.service_id = $1 AND sr.parent_id IS NULL
      ORDER BY sr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(topLevelQuery, [serviceId, limit, offset]);
    console.log('✅ Query successful!');
    console.log('Found', result.rows.length, 'reviews');
    if (result.rows.length > 0) {
      console.log('Columns:', Object.keys(result.rows[0]));
      console.log('First review:', JSON.stringify(result.rows[0], null, 2));
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

testQuery();
