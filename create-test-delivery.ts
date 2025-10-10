import { pool } from './src/db.js';

async function createTestDelivery() {
  try {
    console.log('Creating test delivery...');

    // Update the sample delivery to be in progress and assigned to DEL001
    const updateQuery = `
      UPDATE deliveries
      SET status = 'in_progress',
          delivery_person_id = 'DEL001',
          assigned_at = CURRENT_TIMESTAMP,
          started_at = CURRENT_TIMESTAMP
      WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-001')
    `;

    const result = await pool.query(updateQuery);
    console.log('✅ Test delivery updated:', result.rowCount, 'rows affected');

    // Verify the delivery
    const verifyQuery = `
      SELECT d.*, o.product_id, o.customer_id, o.seller_id
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      WHERE d.delivery_person_id = 'DEL001' AND d.status = 'in_progress'
    `;

    const verifyResult = await pool.query(verifyQuery);
    console.log('✅ Test delivery created:', verifyResult.rows[0]);

  } catch (error) {
    console.error('❌ Error creating test delivery:', error);
  } finally {
    await pool.end();
  }
}

createTestDelivery();
