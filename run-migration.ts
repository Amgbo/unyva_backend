import { pool } from './src/db.js';
import fs from 'fs';
import path from 'path';

async function runMigration(migrationFile: string) {
  try {
    console.log(`🚀 Running migration: ${migrationFile}`);

    const migrationPath = path.join(process.cwd(), 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error);
    throw error;
  }
}

// Run the deals table migration
runMigration('014_create_deals_table.sql')
  .then(() => {
    console.log('🎉 All migrations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
