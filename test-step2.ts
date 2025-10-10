import axios from 'axios';

async function testStep2() {
  console.log('🧪 Testing registration step 2...\n');

  const step2Data = {
    student_id: 'DEL001',
    password: 'password123',
    confirmPassword: 'password123'
  };

  try {
    console.log('Sending step 2 request...');
    const response = await axios.post('http://localhost:5000/api/students/register-step2', step2Data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Step 2 Success!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);

  } catch (error: any) {
    console.log('❌ Step 2 Error!');
    console.log('Status:', error.response?.status);
    console.log('Error data:', error.response?.data);
    console.log('Full error:', error.message);
  }
}

testStep2().catch(console.error);
