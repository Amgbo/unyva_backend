import { pool } from './src/db.js';

async function insertThroneTypes() {
  try {
    const throneTypes = [
      { name: 'top_seller', description: 'Most completed deals this week (orders + deliveries + meetups)', points_required: 1 },
      { name: 'most_trusted_seller', description: 'Highest rated seller with minimum 3 reviews', points_required: 3 },
      { name: 'most_followed_student', description: 'Most new followers gained this week', points_required: 1 },
      { name: 'most_active_student', description: 'Most engagement and activity across the platform', points_required: 0 }
    ];

    for (const throneType of throneTypes) {
      await pool.query(
        'INSERT INTO throne_types (name, description, points_required) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [throneType.name, throneType.description, throneType.points_required]
      );
      console.log(`Inserted throne type: ${throneType.name}`);
    }

    console.log('All throne types inserted successfully');
  } catch (error) {
    console.error('Error inserting throne types:', error);
  } finally {
    await pool.end();
  }
}

insertThroneTypes();
