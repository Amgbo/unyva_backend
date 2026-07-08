import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testCartFull() {
  console.log('🧪 Full cart functionality test...\n');

  try {
    // Step 1: Login to get token
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 'TEST001',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful, got token');

    const authHeader = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Step 2: Get initial cart (should be empty)
    console.log('\n📋 Step 2: Getting initial cart...');
    const initialCartResponse = await fetch(`${BASE_URL}/api/cart`, {
      headers: authHeader
    });

    if (!initialCartResponse.ok) {
      console.log('❌ Get cart failed:', initialCartResponse.status);
      return;
    }

    const initialCart = await initialCartResponse.json();
    console.log('✅ Initial cart:', initialCart);

    // Step 3: Add product to cart (product ID 7, Laptop by student 31313131)
    console.log('\n➕ Step 3: Adding product to cart...');
    const addResponse = await fetch(`${BASE_URL}/api/cart/add`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        productId: 7,
        quantity: 2
      })
    });

    if (!addResponse.ok) {
      console.log('❌ Add to cart failed:', addResponse.status);
      const errorText = await addResponse.text();
      console.log('Error details:', errorText);
      return;
    }

    const addResult = await addResponse.json();
    console.log('✅ Added to cart:', addResult);

    // Step 4: Get cart again (should have the item)
    console.log('\n📋 Step 4: Getting cart after adding...');
    const cartAfterAddResponse = await fetch(`${BASE_URL}/api/cart`, {
      headers: authHeader
    });

    if (!cartAfterAddResponse.ok) {
      console.log('❌ Get cart after add failed:', cartAfterAddResponse.status);
      return;
    }

    const cartAfterAdd = await cartAfterAddResponse.json();
    console.log('✅ Cart after add:', JSON.stringify(cartAfterAdd, null, 2));

    // Step 5: Update quantity
    console.log('\n🔄 Step 5: Updating quantity...');
    const cartItemId = cartAfterAdd.data?.[0]?.id;
    if (!cartItemId) {
      console.log('❌ No cart item ID found');
      return;
    }

    const updateResponse = await fetch(`${BASE_URL}/api/cart/item/${cartItemId}`, {
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify({ quantity: 3 })
    });

    if (!updateResponse.ok) {
      console.log('❌ Update quantity failed:', updateResponse.status);
      return;
    }

    const updateResult = await updateResponse.json();
    console.log('✅ Updated quantity:', updateResult);

    // Step 6: Remove item from cart
    console.log('\n🗑️ Step 6: Removing item from cart...');
    const removeResponse = await fetch(`${BASE_URL}/api/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: authHeader
    });

    if (!removeResponse.ok) {
      console.log('❌ Remove from cart failed:', removeResponse.status);
      return;
    }

    const removeResult = await removeResponse.json();
    console.log('✅ Removed from cart:', removeResult);

    // Step 7: Get final cart (should be empty)
    console.log('\n📋 Step 7: Getting final cart...');
    const finalCartResponse = await fetch(`${BASE_URL}/api/cart`, {
      headers: authHeader
    });

    if (!finalCartResponse.ok) {
      console.log('❌ Get final cart failed:', finalCartResponse.status);
      return;
    }

    const finalCart = await finalCartResponse.json();
    console.log('✅ Final cart:', finalCart);

    console.log('\n🎉 Cart functionality test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCartFull();
