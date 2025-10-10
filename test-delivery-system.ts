import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testDeliverySystem() {
  console.log('🚚 Testing Delivery System...\n');

  try {
    // Step 1: Login as customer
    console.log('🔐 Step 1: Logging in as customer...');
    const loginResponse = await fetch(`${BASE_URL}/api/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 'TEST001',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Customer login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const customerToken = loginData.token;
    console.log('✅ Customer login successful');

    const customerAuthHeader = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    };

    // Step 2: Add product to cart
    console.log('\n➕ Step 2: Adding product to cart...');
    const addResponse = await fetch(`${BASE_URL}/api/cart/add`, {
      method: 'POST',
      headers: customerAuthHeader,
      body: JSON.stringify({
        productId: 7, // Laptop
        quantity: 1
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

    // Step 3: Checkout with delivery option
    console.log('\n💳 Step 3: Checking out with delivery...');
    const checkoutResponse = await fetch(`${BASE_URL}/api/cart/checkout`, {
      method: 'POST',
      headers: customerAuthHeader,
      body: JSON.stringify({
        delivery_option: 'delivery',
        delivery_fee: 5.00,
        delivery_hall_id: 1, // Commonwealth Hall
        delivery_room_number: 'A101',
        special_instructions: 'Leave at reception if not available'
      })
    });

    if (!checkoutResponse.ok) {
      console.log('❌ Checkout failed:', checkoutResponse.status);
      const errorText = await checkoutResponse.text();
      console.log('Error details:', errorText);
      return;
    }

    const checkoutResult = await checkoutResponse.json();
    console.log('✅ Checkout successful:', JSON.stringify(checkoutResult, null, 2));

    // Step 4: Get customer's orders
    console.log('\n📋 Step 4: Getting customer orders...');
    const ordersResponse = await fetch(`${BASE_URL}/api/orders`, {
      headers: customerAuthHeader
    });

    if (!ordersResponse.ok) {
      console.log('❌ Get orders failed:', ordersResponse.status);
      return;
    }

    const ordersResult = await ordersResponse.json();
    console.log('✅ Customer orders:', JSON.stringify(ordersResult, null, 2));

    // Step 5: Login as delivery person
    console.log('\n🚚 Step 5: Logging in as delivery person...');
    const deliveryLoginResponse = await fetch(`${BASE_URL}/api/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: 'DEL001',
        password: 'password123'
      })
    });

    if (!deliveryLoginResponse.ok) {
      console.log('❌ Delivery login failed:', deliveryLoginResponse.status);
      return;
    }

    const deliveryLoginData = await deliveryLoginResponse.json();
    const deliveryToken = deliveryLoginData.token;
    console.log('✅ Delivery login successful');

    const deliveryAuthHeader = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deliveryToken}`
    };

    // Step 6: Get pending deliveries
    console.log('\n📦 Step 6: Getting pending deliveries...');
    const pendingResponse = await fetch(`${BASE_URL}/api/deliveries/pending`, {
      headers: deliveryAuthHeader
    });

    if (!pendingResponse.ok) {
      console.log('❌ Get pending deliveries failed:', pendingResponse.status);
      const errorText = await pendingResponse.text();
      console.log('Error details:', errorText);
      return;
    }

    const pendingResult = await pendingResponse.json();
    console.log('✅ Pending deliveries:', JSON.stringify(pendingResult, null, 2));

    // Step 7: Accept a delivery
    if (pendingResult.pending_deliveries && pendingResult.pending_deliveries.length > 0) {
      const deliveryId = pendingResult.pending_deliveries[0].id;
      console.log(`\n✅ Step 7: Accepting delivery ${deliveryId}...`);

      const acceptResponse = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/accept`, {
        method: 'PATCH',
        headers: deliveryAuthHeader
      });

      if (!acceptResponse.ok) {
        console.log('❌ Accept delivery failed:', acceptResponse.status);
        const errorText = await acceptResponse.text();
        console.log('Error details:', errorText);
        return;
      }

      const acceptResult = await acceptResponse.json();
      console.log('✅ Delivery accepted:', acceptResult);

      // Step 8: Get delivery person's deliveries
      console.log('\n📋 Step 8: Getting delivery person deliveries...');
      const deliveriesResponse = await fetch(`${BASE_URL}/api/deliveries`, {
        headers: deliveryAuthHeader
      });

      if (!deliveriesResponse.ok) {
        console.log('❌ Get deliveries failed:', deliveriesResponse.status);
        return;
      }

      const deliveriesResult = await deliveriesResponse.json();
      console.log('✅ Delivery person deliveries:', JSON.stringify(deliveriesResult, null, 2));

      // Step 9: Complete the delivery
      console.log(`\n🏁 Step 9: Completing delivery ${deliveryId}...`);
      const completeResponse = await fetch(`${BASE_URL}/api/deliveries/${deliveryId}/complete`, {
        method: 'PATCH',
        headers: deliveryAuthHeader,
        body: JSON.stringify({
          rating: 5,
          review: 'Great customer, smooth delivery!'
        })
      });

      if (!completeResponse.ok) {
        console.log('❌ Complete delivery failed:', completeResponse.status);
        const errorText = await completeResponse.text();
        console.log('Error details:', errorText);
        return;
      }

      const completeResult = await completeResponse.json();
      console.log('✅ Delivery completed:', completeResult);

    } else {
      console.log('⚠️ No pending deliveries found to accept');
    }

    console.log('\n🎉 Delivery system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDeliverySystem();
