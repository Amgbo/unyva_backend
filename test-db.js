const { pool } = require('./src/db.js');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');

    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);

    // Check if university_halls table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'university_halls'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ university_halls table does not exist!');
      console.log('📝 Creating table...');

      // Create the table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS university_halls (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL UNIQUE,
          short_name VARCHAR(20),
          description TEXT,
          location_zone VARCHAR(50),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ university_halls table created successfully!');

      // Insert sample data
      console.log('📝 Inserting University of Ghana hall data...');
      await pool.query(`
        INSERT INTO university_halls (full_name, short_name, location_zone) VALUES
        ('Commonwealth Hall', 'Commey', 'Main Campus'),
        ('Legon Hall', 'Legon', 'Main Campus'),
        ('Volta Hall', 'Volta', 'Main Campus'),
        ('Akuafo Hall', 'Akuafo', 'Main Campus'),
        ('Mensah Sarbah Hall', 'Sarbah', 'Main Campus'),
        ('Jean Nelson Aka Hall', 'JNA', 'Main Campus'),
        ('Elizabeth Sey Hall', 'E-Sey', 'Main Campus'),
        ('Hilla Limann Hall', 'Limann', 'Main Campus'),
        ('Alexander Kwapong Hall', 'Kwapong', 'Main Campus'),
        ('James Topp Nelson Yankah Hall', 'JTNY', 'Main Campus'),
        ('Bani Hall', 'Bani', 'Main Campus'),
        ('Africa Hall', 'Africa', 'Main Campus'),
        ('International Students Hostel', 'ISH', 'Main Campus'),
        ('Valco Trust Hostel', 'Valco', 'Main Campus'),
        ('Off-Campus', 'Off-Campus', 'Off-Campus')
        ON CONFLICT (full_name) DO NOTHING;
      `);

      console.log('✅ Hall data inserted successfully!');
    } else {
      console.log('✅ university_halls table already exists!');
    }

    // Test fetching halls
    console.log('🔍 Testing hall fetching...');
    const hallsResult = await pool.query('SELECT id, full_name FROM university_halls ORDER BY full_name ASC');
    console.log(`✅ Found ${hallsResult.rows.length} halls:`);
    hallsResult.rows.forEach(hall => {
      console.log(`   - ${hall.full_name} (ID: ${hall.id})`);
    });

    // Test the exact query from the model
    console.log('🔍 Testing model query...');
    const modelQuery = 'SELECT id, name FROM university_halls ORDER BY name ASC';
    const modelResult = await pool.query(modelQuery);
    console.log(`✅ Model query successful! Found ${modelResult.rows.length} halls`);

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();
