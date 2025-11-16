import { pool } from './src/db.ts';

async function checkServiceReviewsTable() {
  try {
    console.log('🔍 Checking service_reviews table...');

    // Check if table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'service_reviews'
      );
    `;

    const tableCheckResult = await pool.query(tableCheckQuery);
    const tableExists = tableCheckResult.rows[0].exists;

    if (!tableExists) {
      console.error('❌ service_reviews table does NOT exist!');
      console.log('\n📋 Available tables:');
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `;
      const tablesResult = await pool.query(tablesQuery);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      process.exit(1);
    }

    console.log('✅ service_reviews table EXISTS');

    // Check columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'service_reviews'
      ORDER BY ordinal_position;
    `;

    const columnsResult = await pool.query(columnsQuery);
    console.log('\n📊 Columns in service_reviews:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
    });

    // Check row count
    const countQuery = 'SELECT COUNT(*) as count FROM service_reviews;';
    const countResult = await pool.query(countQuery);
    const rowCount = countResult.rows[0].count;
    console.log(`\n📈 Total reviews: ${rowCount}`);

    // Check if required columns exist
    const requiredColumns = ['id', 'service_id', 'customer_id', 'rating', 'comment', 'parent_id', 'depth', 'thread_root_id'];
    const existingColumns = columnsResult.rows.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.error(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
      console.log('⚠️  You may need to run the DATABASE_MIGRATION.sql');
    } else {
      console.log('\n✅ All required columns present');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking table:', error);
    process.exit(1);
  }
}

checkServiceReviewsTable();
