import { Pool } from 'pg';

// Test script to verify the delivery completion trigger works
async function testDeliveryTrigger() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing delivery completion trigger...');

    // Create test data
    const testOrder = await pool.query(`
      INSERT INTO orders (order_number, customer_id, seller_id, product_id, quantity, unit_price, total_price, delivery_option, delivery_fee, status)
      VALUES ('TEST-ORD-001', 'TEST001', 'TEST002', 1, 1, 100.00, 105.00, 'delivery', 5.00, 'confirmed')
      RETURNING id
    `);

    const orderId = testOrder.rows[0].id;
    console.log(`Created test order with ID: ${orderId}`);

    // Create test delivery
    const testDelivery = await pool.query(`
      INSERT INTO deliveries (order_id, customer_id, seller_id, delivery_fee, status)
      VALUES ($1, 'TEST001', 'TEST002', 5.00, 'in_progress')
      RETURNING id
    `, [orderId]);

    const deliveryId = testDelivery.rows[0].id;
    console.log(`Created test delivery with ID: ${deliveryId}`);

    // Check initial order status
    const initialOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    console.log(`Initial order status: ${initialOrder.rows[0].status}`);

    // Update delivery status to 'completed'
    await pool.query('UPDATE deliveries SET status = $1 WHERE id = $2', ['completed', deliveryId]);
    console.log('Updated delivery status to completed');

    // Check if order status was automatically updated
    const updatedOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    console.log(`Updated order status: ${updatedOrder.rows[0].status}`);

    if (updatedOrder.rows[0].status === 'delivered') {
      console.log('✅ SUCCESS: Trigger worked! Order status automatically updated to delivered');
    } else {
      console.log('❌ FAILED: Trigger did not work. Order status is still:', updatedOrder.rows[0].status);
    }

    // Clean up test data
    await pool.query('DELETE FROM deliveries WHERE id = $1', [deliveryId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    console.log('Cleaned up test data');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDeliveryTrigger().catch(console.error);
