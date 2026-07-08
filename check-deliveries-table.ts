import { pool } from './src/db.js';

async function checkDeliveriesTable() {
  try {
    console.log(' Checking deliveries table columns...');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'deliveries'
      ORDER BY ordinal_position
    `);

    console.log(' Deliveries table columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error(' Error checking deliveries table:', error);
  } finally {
    await pool.end();
  }
}

checkDeliveriesTable();
