import { pool } from './src/db.js';

async function updateConstraint() {
  try {
    console.log('Updating rating constraint for product_reviews table...');

    // First drop the existing constraint if it exists
    await pool.query(`
      ALTER TABLE product_reviews
      DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
    `);

    // Add the new constraint allowing 0 for replies
    await pool.query(`
      ALTER TABLE product_reviews
      ADD CONSTRAINT product_reviews_rating_check
      CHECK (rating >= 0 AND rating <= 5);
    `);

    console.log('✅ Rating constraint updated successfully!');
    console.log('Now rating can be 0 (for replies) to 5 (for reviews).');

  } catch (error) {
    console.error('❌ Error updating constraint:', error);
  } finally {
    await pool.end();
  }
}

updateConstraint();
