import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_ZvSs5lG4EHCd@ep-withered-hat-addwuvmg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🔍 Checking Neon database migration...');

try {
  // Test connection and list tables
  console.log('📋 Listing all tables in Neon database...');
  const listTablesCommand = `psql "${NEON_CONNECTION_STRING}" -c "\\dt"`;

  console.log('Executing:', listTablesCommand.replace(/:[^:]+@/, ':***@'));
  const result = execSync(listTablesCommand, {
    encoding: 'utf8',
    cwd: __dirname
  });

  console.log('📊 Tables found:');
  console.log(result);

  // Check specific tables
  const tablesToCheck = ['students', 'products', 'services', 'orders', 'deliveries', 'university_halls'];

  console.log('\n🔍 Checking specific tables...');
  for (const table of tablesToCheck) {
    try {
      const countCommand = `psql "${NEON_CONNECTION_STRING}" -c "SELECT COUNT(*) FROM ${table};"`;
      const countResult = execSync(countCommand, {
        encoding: 'utf8',
        cwd: __dirname
      });
      console.log(`✅ ${table}: ${countResult.trim().split('\n')[2] || '0'} records`);
    } catch (error) {
      console.log(`❌ ${table}: Table not found or error`);
    }
  }

  console.log('\n✅ Migration check completed!');

} catch (error) {
  console.error('❌ Migration check failed:', error.message);
  process.exit(1);
}
