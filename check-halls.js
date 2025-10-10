import { pool } from './src/db.js';

(async () => {
  try {
    console.log('🔍 Checking university_halls table...');

    // Check total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM university_halls');
    console.log('📊 Total halls in database:', countResult.rows[0].total);

    // Check active halls
    const activeResult = await pool.query('SELECT COUNT(*) as active FROM university_halls WHERE is_active = TRUE');
    console.log('✅ Active halls:', activeResult.rows[0].active);

    // Check inactive halls
    const inactiveResult = await pool.query('SELECT COUNT(*) as inactive FROM university_halls WHERE is_active = FALSE');
    console.log('❌ Inactive halls:', inactiveResult.rows[0].inactive);

    // Show all halls
    console.log('\n📋 All halls in database:');
    const allHalls = await pool.query('SELECT id, full_name, short_name, is_active FROM university_halls ORDER BY full_name');
    allHalls.rows.forEach(hall => {
      console.log(`  ${hall.id}: ${hall.full_name} (${hall.short_name || 'N/A'}) - ${hall.is_active ? '✅' : '❌'}`);
    });

    // Test the exact query from the model
    console.log('\n🔍 Testing model query:');
    const modelQuery = 'SELECT id, full_name, short_name, location_zone, is_active FROM university_halls WHERE is_active = TRUE ORDER BY full_name ASC';
    const modelResult = await pool.query(modelQuery);
    console.log(`Model query returned ${modelResult.rows.length} halls:`);
    modelResult.rows.forEach(hall => {
      console.log(`  - ${hall.full_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
})();
