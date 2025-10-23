import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_ZvSs5lG4EHCd@ep-withered-hat-addwuvmg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const SQL_FILE = path.join(__dirname, 'my_unyva_db.sql');

console.log('🚀 Starting migration to Neon database...');
console.log('📁 SQL file:', SQL_FILE);
console.log('🔗 Connection:', NEON_CONNECTION_STRING.replace(/:[^:]+@/, ':***@'));

try {
  // Check if SQL file exists
  if (!fs.existsSync(SQL_FILE)) {
    throw new Error(`SQL file not found: ${SQL_FILE}`);
  }

  console.log('📄 Reading SQL file...');
  const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
  console.log(`📏 SQL file size: ${sqlContent.length} characters`);

  // Execute the migration
  console.log('🔄 Executing migration...');
  const command = `psql "${NEON_CONNECTION_STRING}" -f "${SQL_FILE}"`;

  execSync(command, {
    stdio: 'inherit',
    cwd: __dirname
  });

  console.log('✅ Migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
