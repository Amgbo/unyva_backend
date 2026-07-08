import { pool } from './src/db.js';
import fs from 'fs';

async function addRatingColumns() {
  try {
    console.log('Adding rating and review_count columns to products table...');

    const sql = fs.readFileSync('add-rating-reviewcount-to-products.sql', 'utf8');

    await pool.query(sql);

    console.log('✅ Successfully added rating and review_count columns to products table');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
  } finally {
    await pool.end();
  }
}

addRatingColumns();
