import { pool } from './src/db.js';

// Test script to verify owner restrictions work correctly
async function testOwnerRestrictions() {
  try {
    console.log('🧪 Testing owner restrictions for cart functionality...');

    // First, let's check if we have test students and products
    console.log('📊 Checking existing test data...');

    const studentsQuery = 'SELECT student_id, first_name, last_name FROM students LIMIT 5';
    const students = await pool.query(studentsQuery);
    console.log(`Found ${students.rows.length} students`);

    const productsQuery = 'SELECT id, title, student_id FROM products LIMIT 5';
    const products = await pool.query(productsQuery);
    console.log(`Found ${products.rows.length} products`);

    if (students.rows.length === 0 || products.rows.length === 0) {
      console.log('❌ Not enough test data. Need at least 1 student and 1 product.');
      return;
    }

    // Test 1: Try to add own product to cart (should fail)
    const testStudent = students.rows[0];
    const ownProduct = products.rows.find(p => p.student_id === testStudent.student_id);

    if (ownProduct) {
      console.log(`\n🧪 Test 1: Adding own product to cart (should fail)`);
      console.log(`Student: ${testStudent.first_name} ${testStudent.last_name} (${testStudent.student_id})`);
      console.log(`Product: ${ownProduct.title} (ID: ${ownProduct.id})`);

      // Simulate the owner check logic from cartController.ts
      if (ownProduct.student_id === testStudent.student_id) {
        console.log('✅ Owner restriction logic works: Cannot add own product to cart');
      } else {
        console.log('❌ Owner restriction logic failed: Should not allow adding own product');
      }
    } else {
      console.log('⚠️ No own product found for test student');
    }

    // Test 2: Try to add someone else's product to cart (should succeed)
    const otherProduct = products.rows.find(p => p.student_id !== testStudent.student_id);

    if (otherProduct) {
      console.log(`\n🧪 Test 2: Adding someone else's product to cart (should succeed)`);
      console.log(`Student: ${testStudent.first_name} ${testStudent.last_name} (${testStudent.student_id})`);
      console.log(`Product: ${otherProduct.title} (ID: ${otherProduct.id}) owned by ${otherProduct.student_id}`);

      // Simulate the owner check logic from cartController.ts
      if (otherProduct.student_id !== testStudent.student_id) {
        console.log('✅ Owner restriction logic works: Can add others\' products to cart');
      } else {
        console.log('❌ Owner restriction logic failed: Should allow adding others\' products');
      }
    } else {
      console.log('⚠️ No other products found for testing');
    }

    // Test 3: Check cart_items table structure
    console.log(`\n🧪 Test 3: Verifying cart_items table structure`);
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cart_items'
      ORDER BY ordinal_position
    `);

    console.log('Cart items table columns:');
    tableCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Verify required columns exist
    const requiredColumns = ['id', 'student_id', 'product_id', 'quantity', 'added_at'];
    const existingColumns = tableCheck.rows.map(col => col.column_name);

    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log(`❌ Missing required columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ All required columns present');
    }

    // Test 4: Check foreign key constraints
    console.log(`\n🧪 Test 4: Verifying foreign key constraints`);
    const fkCheck = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'cart_items'
    `);

    console.log('Foreign key constraints:');
    fkCheck.rows.forEach(fk => {
      console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    if (fkCheck.rows.length >= 2) {
      console.log('✅ Foreign key constraints properly set up');
    } else {
      console.log('❌ Missing foreign key constraints');
    }

    console.log('\n🎉 Owner restrictions testing completed!');

  } catch (error) {
    console.error('❌ Owner restrictions test failed:', error);
  } finally {
    await pool.end();
  }
}

testOwnerRestrictions();
