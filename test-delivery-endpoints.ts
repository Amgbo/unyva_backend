import axios, { AxiosResponse } from 'axios';

// Test delivery endpoints
const BASE_URL = 'http://localhost:5000/api/deliveries';

// Mock JWT token (you'll need to get a real one from login)
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  earnings: number;
}

interface Delivery {
  id: number;
  status: string;
  pickup_location: string;
  delivery_location: string;
  customer_name: string;
  // Add other delivery properties as needed
}

async function testDeliveryEndpoints(): Promise<void> {
  console.log('🧪 Testing Delivery API Endpoints...\n');

  try {
    // Test 1: Get delivery stats
    console.log('1️⃣ Testing GET /api/deliveries/stats');
    try {
      const statsResponse: AxiosResponse<DeliveryStats> = await axios.get(`${BASE_URL}/stats`, { headers });
      console.log('✅ Stats endpoint working:', statsResponse.data);
    } catch (error: any) {
      console.log('❌ Stats endpoint failed:', error.response?.data || error.message);
    }

    // Test 2: Get deliveries
    console.log('\n2️⃣ Testing GET /api/deliveries');
    try {
      const deliveriesResponse: AxiosResponse<Delivery[]> = await axios.get(`${BASE_URL}`, { headers });
      console.log('✅ Deliveries endpoint working:', deliveriesResponse.data);
    } catch (error: any) {
      console.log('❌ Deliveries endpoint failed:', error.response?.data || error.message);
    }

    // Test 3: Get pending deliveries
    console.log('\n3️⃣ Testing GET /api/deliveries/pending');
    try {
      const pendingResponse: AxiosResponse<Delivery[]> = await axios.get(`${BASE_URL}/pending`, { headers });
      console.log('✅ Pending deliveries endpoint working:', pendingResponse.data);
    } catch (error: any) {
      console.log('❌ Pending deliveries endpoint failed:', error.response?.data || error.message);
    }

    // Test 4: Accept delivery (will fail without valid delivery ID)
    console.log('\n4️⃣ Testing PATCH /api/deliveries/:id/accept');
    try {
      const acceptResponse: AxiosResponse<{ message: string }> = await axios.patch(`${BASE_URL}/1/accept`, {}, { headers });
      console.log('✅ Accept delivery endpoint working:', acceptResponse.data);
    } catch (error: any) {
      console.log('ℹ️ Accept delivery endpoint (expected to fail without valid data):', error.response?.data?.error || error.message);
    }

    // Test 5: Complete delivery (will fail without valid delivery ID)
    console.log('\n5️⃣ Testing PATCH /api/deliveries/:id/complete');
    try {
      const completeResponse: AxiosResponse<{ message: string }> = await axios.patch(`${BASE_URL}/1/complete`, {
        rating: 5,
        review: "Great service!"
      }, { headers });
      console.log('✅ Complete delivery endpoint working:', completeResponse.data);
    } catch (error: any) {
      console.log('ℹ️ Complete delivery endpoint (expected to fail without valid data):', error.response?.data?.error || error.message);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 Delivery API Test Instructions:');
console.log('1. Make sure the backend server is running');
console.log('2. Get a valid JWT token from login endpoint');
console.log('3. Replace YOUR_JWT_TOKEN_HERE with the actual token');
console.log('4. Make sure you have a delivery person account (role: delivery)');
console.log('5. Run this script: npx ts-node test-delivery-endpoints.ts\n');

// Run tests if token is provided
if (AUTH_TOKEN !== 'YOUR_JWT_TOKEN_HERE') {
  testDeliveryEndpoints();
} else {
  console.log('⚠️ Please set a valid JWT token first!');
}
