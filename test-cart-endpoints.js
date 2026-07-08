const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

// Test cart endpoints
async function testCartEndpoints() {
  console.log('🧪 Testing cart endpoints...\n');

  try {
    // Test 1: Get cart without auth (should fail)
    console.log('Test 1: GET /api/cart without auth');
    const response1 = await fetch(`${BASE_URL}/cart`);
    console.log(`Status: ${response1.status}`);
    if (response1.status === 401) {
      console.log('✅ Correctly requires authentication\n');
    } else {
      console.log('❌ Should require authentication\n');
    }

    // Test 2: Add to cart without auth (should fail)
    console.log('Test 2: POST /api/cart/add without auth');
    const response2 = await fetch(`${BASE_URL}/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 1, quantity: 1 })
    });
    console.log(`Status: ${response2.status}`);
    if (response2.status === 401) {
      console.log('✅ Correctly requires authentication\n');
    } else {
      console.log('❌ Should require authentication\n');
    }

    // Test 3: Check if cart routes are registered
    console.log('Test 3: Check if cart routes are accessible');
    const response3 = await fetch(`${BASE_URL}/cart`, {
      headers: { 'Authorization': 'Bearer invalid_token' }
    });
    console.log(`Status: ${response3.status}`);
    if (response3.status === 401) {
      console.log('✅ Route exists and auth middleware is working\n');
    } else if (response3.status === 404) {
      console.log('❌ Route not found - cart routes may not be registered\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCartEndpoints();
