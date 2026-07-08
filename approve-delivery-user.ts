import { pool } from './db.js';

async function approveDeliveryUser(studentId: string) {
  try {
    console.log(`Approving delivery user: ${studentId}`);

    const result = await pool.query(
      'UPDATE students SET is_delivery_approved = true WHERE student_id = $1 AND role = $2 RETURNING *',
      [studentId, 'delivery']
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found or not a delivery user');
      return false;
    }

    console.log('✅ Delivery user approved:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Error approving delivery user:', error);
    return false;
  }
}

async function createTestDeliveryUser() {
  try {
    console.log('Creating test delivery user...');

    // First check if test delivery user already exists
    const existing = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      ['DEL001']
    );

    if (existing.rows.length > 0) {
      console.log('Test delivery user already exists');
      return existing.rows[0];
    }

    // Create test delivery user
    const result = await pool.query(
      `INSERT INTO students (
        student_id, email, first_name, last_name, phone, gender, date_of_birth,
        hall_of_residence, room_number, verification_token, is_verified, role,
        delivery_code, is_delivery_approved, university, program, graduation_year, password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        'DEL001',
        'test.delivery@university.edu',
        'Test',
        'Delivery',
        '+233209876543',
        'Male',
        '2000-05-15',
        'Commonwealth Hall',
        '123',
        null,
        true,
        'delivery',
        'TEST-CODE',
        true, // is_delivery_approved
        'University of Ghana',
        'Computer Science',
        2024,
        '$2b$10$hashedpassword' // dummy hash
      ]
    );

    console.log('✅ Test delivery user created:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating test delivery user:', error);
    return null;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npm run tsx approve-delivery-user.ts create-test  # Create test delivery user');
    console.log('  npm run tsx approve-delivery-user.ts approve <studentId>  # Approve existing user');
    process.exit(1);
  }

  const command = args[0];

  if (command === 'create-test') {
    await createTestDeliveryUser();
  } else if (command === 'approve' && args[1]) {
    const studentId = args[1];
    await approveDeliveryUser(studentId);
  } else {
    console.log('Invalid command');
  }

  pool.end();
}

// If run directly
if (require.main === module) {
  main().catch(console.error);
}

export { approveDeliveryUser, createTestDeliveryUser };
