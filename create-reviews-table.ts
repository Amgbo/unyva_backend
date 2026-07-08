import { ReviewModel } from './src/models/reviewModel.js';

async function createReviewsTable(): Promise<void> {
  try {
    await ReviewModel.createTable();
    console.log('✅ Product reviews table created successfully');
  } catch (error) {
    console.error('❌ Error creating reviews table:', error);
  }
}

createReviewsTable();
