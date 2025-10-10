import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Siderpsk123$',
  database: process.env.DB_NAME || 'my_unyva_db',
});

async function migrateServicesTable() {
  try {
    console.log('🔍 Checking services table structure...');

    // Check if columns exist
    const availabilityCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'services' AND column_name = 'availability_schedule'
    `);

    const imageUrlsCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'services' AND column_name = 'image_urls'
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

    if (imageUrlsCheck.rows.length === 0) {
      console.log('❌ image_urls column missing, adding...');
      await pool.query(`
        ALTER TABLE services ADD COLUMN image_urls TEXT[]
      `);
      console.log('✅ image_urls column added');
    } else {
      console.log('✅ image_urls column already exists');
    }

    console.log('🎉 Services table migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateServicesTable();
