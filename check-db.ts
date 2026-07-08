import { pool } from './src/db.js';

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...\n');

    // Check students
    const students = await pool.query('SELECT student_id, first_name, email FROM students LIMIT 5');
    console.log('Students:', students.rows.length);
    students.rows.forEach((s: any) => console.log(`  - ${s.student_id}: ${s.first_name} (${s.email})`));

    // Check products
    const products = await pool.query('SELECT id, title, student_id, status FROM products LIMIT 5');
    console.log('\nProducts:', products.rows.length);
    products.rows.forEach((p: any) => console.log(`  - ${p.id}: ${p.title} (by ${p.student_id}, status: ${p.status})`));

    // Check cart
    const cart = await pool.query('SELECT * FROM cart LIMIT 5');
    console.log('\nCart items:', cart.rows.length);
    cart.rows.forEach((c: any) => console.log(`  - ${c.id}: student ${c.student_id}, product ${c.product_id}, qty ${c.quantity}`));

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
