import { pool } from './db.js';

async function initializeDatabase() {
  try {
    console.log('🔍 Testing database connection...');

    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);

    // Get current database name
    const dbResult = await pool.query('SELECT current_database()');
    console.log('📊 Connected to database:', dbResult.rows[0].current_database);

    // Check if students table exists
    const studentsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'students'
      );
    `);

    if (!studentsTableCheck.rows[0].exists) {
      console.log('❌ students table does not exist!');
      console.log('📝 Creating students table...');

      // Create the students table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS students (
          student_id VARCHAR(20) PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          phone VARCHAR(20) NOT NULL,
          gender VARCHAR(10),
          hall_of_residence TEXT,
          date_of_birth DATE,
          profile_picture TEXT,
          id_card TEXT,
          password TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token VARCHAR(255),
          role VARCHAR(20) DEFAULT 'buyer_seller',
          delivery_code VARCHAR(20) DEFAULT NULL,
          is_delivery_approved BOOLEAN DEFAULT false,
          university VARCHAR(255) DEFAULT NULL,
          program VARCHAR(255) DEFAULT NULL,
          graduation_year INTEGER DEFAULT NULL,
          rating DECIMAL(3,2) DEFAULT 5.0,
          total_ratings INTEGER DEFAULT 0,
          room_number VARCHAR(20),
          is_active_seller BOOLEAN DEFAULT FALSE,
          is_active_service_provider BOOLEAN DEFAULT FALSE,
          seller_rating DECIMAL(3,2) DEFAULT 5.0,
          seller_review_count INTEGER DEFAULT 0,
          service_provider_rating DECIMAL(3,2) DEFAULT 5.0,
          service_review_count INTEGER DEFAULT 0,
          delivery_rating DECIMAL(3,2) DEFAULT 5.0,
          delivery_review_count INTEGER DEFAULT 0,
          total_transactions INTEGER DEFAULT 0,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          profile_completion_score INTEGER DEFAULT 0,
          preferred_contact_method VARCHAR(20) DEFAULT 'in_app',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ students table created successfully!');
    } else {
      console.log('✅ students table already exists!');
    }

    // Check if university_halls table exists
    const hallsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'university_halls'
      );
    `);

    if (!hallsTableCheck.rows[0].exists) {
      console.log('❌ university_halls table does not exist!');
      console.log('📝 Creating university_halls table...');

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

    // Check if delivery_codes table exists
    const deliveryCodesTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'delivery_codes'
      );
    `);

    if (!deliveryCodesTableCheck.rows[0].exists) {
      console.log('❌ delivery_codes table does not exist!');
      console.log('📝 Creating delivery_codes table...');

      // Create the delivery_codes table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS delivery_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) UNIQUE NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          used_by_student_id VARCHAR(20) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP DEFAULT NULL,
          expires_at TIMESTAMP DEFAULT NULL
        );
      `);

      console.log('✅ delivery_codes table created successfully!');

      // Insert some initial delivery codes
      console.log('📝 Inserting initial delivery codes...');
      await pool.query(`
        INSERT INTO delivery_codes (code, expires_at) VALUES
        ('UNYVA-2024DEL', NOW() + INTERVAL '1 year'),
        ('UNYVA-STUDENT', NOW() + INTERVAL '1 year'),
        ('UNYVA-RUNNER', NOW() + INTERVAL '1 year'),
        ('UNYVA-GHANA24', NOW() + INTERVAL '1 year'),
        ('UNYVA-DELIVER', NOW() + INTERVAL '1 year')
        ON CONFLICT (code) DO NOTHING;
      `);

      console.log('✅ Delivery codes inserted successfully!');
    } else {
      console.log('✅ delivery_codes table already exists!');
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
    const modelQuery = 'SELECT id, full_name, short_name, location_zone, is_active FROM university_halls WHERE is_active = TRUE ORDER BY full_name ASC';
    const modelResult = await pool.query(modelQuery);
    console.log(`✅ Model query successful! Found ${modelResult.rows.length} halls`);

    // Check if services table exists and add missing columns
    console.log('🔍 Checking services table...');
    const servicesTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'services'
      );
    `);

    if (servicesTableCheck.rows[0].exists) {
      console.log('✅ services table exists, checking for missing columns...');

      // Check and add availability_schedule column
      const availabilityCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'availability_schedule'
      `);

      if (availabilityCheck.rows.length === 0) {
        console.log('❌ availability_schedule column missing, adding...');
        await pool.query(`
          ALTER TABLE services ADD COLUMN availability_schedule JSONB
        `);
        console.log('✅ availability_schedule column added');
      } else {
        console.log('✅ availability_schedule column already exists');
      }

      // Check and add image_urls column
      const imageUrlsCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'services' AND column_name = 'image_urls'
      `);

      if (imageUrlsCheck.rows.length === 0) {
        console.log('❌ image_urls column missing, adding...');
        await pool.query(`
          ALTER TABLE services ADD COLUMN image_urls TEXT[]
        `);
        console.log('✅ image_urls column added');
      } else {
        console.log('✅ image_urls column already exists');
      }
    } else {
      console.log('❌ services table does not exist! Please run the services migration SQL first.');
    }

    // Note: Using existing 'cart' table instead of 'cart_items'
    console.log('🔍 Checking cart table...');
    const cartTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'cart'
      );
    `);

    if (!cartTableCheck.rows[0].exists) {
      console.log('❌ cart table does not exist! Please ensure it is created via the schema.');
    } else {
      console.log('✅ cart table already exists!');
    }

    // Check if orders table exists
    const ordersTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'orders'
      );
    `);

    if (!ordersTableCheck.rows[0].exists) {
      console.log('❌ orders table does not exist!');
      console.log('📝 Creating orders table...');

      // Create the orders table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
          seller_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
          product_id INTEGER NOT NULL REFERENCES products(id),
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
          total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
          delivery_option VARCHAR(20) NOT NULL CHECK (delivery_option IN ('pickup', 'delivery')),
          delivery_fee DECIMAL(10,2) DEFAULT 0 CHECK (delivery_fee >= 0),
          status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
          payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
          delivery_hall_id INTEGER REFERENCES university_halls(id),
          delivery_room_number VARCHAR(20),
          special_instructions TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ orders table created successfully!');
    } else {
      console.log('✅ orders table already exists!');
    }

    // Check if deliveries table exists
    const deliveriesTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'deliveries'
      );
    `);

    if (!deliveriesTableCheck.rows[0].exists) {
      console.log('❌ deliveries table does not exist!');
      console.log('📝 Creating deliveries table...');

      // Create the deliveries table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS deliveries (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          customer_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
          seller_id VARCHAR(20) NOT NULL REFERENCES students(student_id),
          delivery_person_id VARCHAR(20) REFERENCES students(student_id),
          pickup_hall_id INTEGER REFERENCES university_halls(id),
          pickup_room_number VARCHAR(20),
          delivery_hall_id INTEGER REFERENCES university_halls(id),
          delivery_room_number VARCHAR(20),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
          delivery_fee DECIMAL(10,2) DEFAULT 0 CHECK (delivery_fee >= 0),
          notes TEXT,
          assigned_at TIMESTAMP DEFAULT NULL,
          started_at TIMESTAMP DEFAULT NULL,
          completed_at TIMESTAMP DEFAULT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          review TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ deliveries table created successfully!');
    } else {
      console.log('✅ deliveries table already exists!');

      // Check if seller_id column exists in deliveries
      const sellerIdCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'deliveries' AND column_name = 'seller_id'
      `);

      if (sellerIdCheck.rows.length === 0) {
        console.log('❌ seller_id column missing in deliveries, adding...');
        await pool.query(`
          ALTER TABLE deliveries ADD COLUMN seller_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE
        `);
        console.log('✅ seller_id column added to deliveries');
      } else {
        console.log('✅ seller_id column already exists in deliveries');
      }
    }

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

export { initializeDatabase };

