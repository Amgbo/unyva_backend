import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/students';

// Test delivery registration with delivery code
interface RegisterData {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  hall_of_residence: string;
  date_of_birth: string; // Format: DD-MM-YYYY
  role: string;
  delivery_code?: string;
  university: string;
  program: string;
  graduation_year: number;
}

async function testDeliveryRegistration(): Promise<void> {
  console.log('🧪 Testing Delivery Registration with Delivery Code...\n');

  // Test data for delivery person registration
  const deliveryRegistrationData: RegisterData = {
    student_id: 'DEL001',
    first_name: 'Alex',
    last_name: 'Runner',
    email: 'alex.runner@university.edu',
    phone: '+233209876543',
    gender: 'Male',
    hall_of_residence: 'Commonwealth Hall',
    date_of_birth: '15-05-2000', // DD-MM-YYYY format
    role: 'delivery',
    delivery_code: 'UNYVA-DELIVER', // Using one of our delivery codes
    university: 'University of Ghana',
    program: 'Computer Science',
    graduation_year: 2024
  };

  try {
    console.log('1️⃣ Testing delivery registration with valid delivery code...');
    const registerResponse = await axios.post(`${BASE_URL}/register-step1`, deliveryRegistrationData);

    console.log('✅ Delivery registration successful!');
    console.log('Response:', registerResponse.data);

    // Test login to verify the account was created
    console.log('\n2️⃣ Testing login for delivery account...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      student_id: deliveryRegistrationData.student_id,
      password: 'password123' // Password will be set in step 2, but for now let's assume it's set
    });

    console.log('✅ Delivery login successful!');
    console.log('User role:', loginResponse.data.user.role);
    console.log('Delivery approved:', loginResponse.data.user.is_delivery_approved);

    // Test delivery endpoints with the JWT token
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n3️⃣ Testing delivery endpoints access...');
    const deliveryStatsResponse = await axios.get('http://localhost:5000/api/deliveries/stats', { headers });
    console.log('✅ Delivery stats access successful:', deliveryStatsResponse.data);

  } catch (error: any) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.log('Full error response:', error.response);
    }
  }

  // Test invalid delivery code
  console.log('\n4️⃣ Testing registration with invalid delivery code...');
  const invalidDeliveryData: RegisterData = {
    ...deliveryRegistrationData,
    student_id: 'DEL002',
    email: 'invalid.delivery@university.edu',
    delivery_code: 'INVALID-CODE'
  };

  try {
    const invalidResponse = await axios.post(`${BASE_URL}/register-step1`, invalidDeliveryData);
    console.log('❌ Should have failed with invalid code, but succeeded:', invalidResponse.data);
  } catch (error: any) {
    console.log('✅ Correctly rejected invalid delivery code:', error.response?.data?.error || error.message);
  }

  // Test registration without delivery code for delivery role
  console.log('\n5️⃣ Testing registration without delivery code for delivery role...');
  const noCodeDeliveryData: RegisterData = {
    ...deliveryRegistrationData,
    student_id: 'DEL003',
    email: 'nocode.delivery@university.edu'
  };
  delete noCodeDeliveryData.delivery_code;

  try {
    const noCodeResponse = await axios.post(`${BASE_URL}/register-step1`, noCodeDeliveryData);
    console.log('❌ Should have failed without delivery code, but succeeded:', noCodeResponse.data);
  } catch (error: any) {
    console.log('✅ Correctly required delivery code for delivery role:', error.response?.data?.error || error.message);
  }
}

// Instructions
console.log('📋 Delivery Registration Test Instructions:');
console.log('1. Make sure the backend server is running');
console.log('2. Make sure the database has been initialized with delivery codes');
console.log('3. Run this script: npx ts-node test-delivery-registration.ts\n');

// Run tests
testDeliveryRegistration().catch(console.error);
