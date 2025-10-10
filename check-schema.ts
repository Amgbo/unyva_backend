import { pool } from './src/db.js';

async function checkSchema() {
  try {
    console.log('=== DATABASE SCHEMA CHECK ===\n');

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables found:', tablesResult.rows.map(r => r.table_name).join(', '));
    console.log('\n');

    // Check key tables
    const keyTables = ['products', 'product_reviews', 'students', 'orders', 'cart_items'];

    for (const tableName of keyTables) {
      console.log(`=== TABLE: ${tableName.toUpperCase()} ===`);

      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (columnsResult.rows.length === 0) {
        console.log(`Table '${tableName}' does not exist!\n`);
        continue;
      }

      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });

      console.log('');
    }

    // Check foreign key constraints
    console.log('=== FOREIGN KEY CONSTRAINTS ===');
    const fkResult = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);

    fkResult.rows.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('\n=== SCHEMA CHECK COMPLETE ===');

  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
