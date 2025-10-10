import axios from 'axios';

async function testLogin() {
  console.log('🧪 Testing login...\n');

  const loginData = {
    student_id: 'DEL001',
    password: 'password123'
  };

  try {
    console.log('Sending login request...');
    const response = await axios.post('http://localhost:5000/api/students/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login Success!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);

  } catch (error: any) {
    console.log('❌ Login Error!');
    console.log('Status:', error.response?.status);
    console.log('Error data:', error.response?.data);
    console.log('Full error:', error.message);
  }
}

testLogin().catch(console.error);
