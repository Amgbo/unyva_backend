import axios from 'axios';

async function testSimpleRegistration() {
  console.log('🧪 Testing simple delivery registration...\n');

  const testData = {
    student_id: 'DEL001',
    first_name: 'Alex',
    last_name: 'Runner',
    email: 'alex.runner@university.edu',
    phone: '+233209876543',
    gender: 'Male',
    hall_of_residence: 'Commonwealth Hall',
    date_of_birth: '15-05-2000',
    role: 'delivery',
    delivery_code: 'UNYVA-DELIVER',
    university: 'University of Ghana',
    program: 'Computer Science',
    graduation_year: 2024
  };

  try {
    console.log('Sending request to:', 'http://localhost:5000/api/students/register-step1');
    console.log('Data:', JSON.stringify(testData, null, 2));

    const response = await axios.post('http://localhost:5000/api/students/register-step1', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);

  } catch (error: any) {
    console.log('❌ Error!');
    console.log('Status:', error.response?.status);
    console.log('Error data:', error.response?.data);
    console.log('Full error:', error.message);

    if (error.response) {
      console.log('Full response:', error.response);
    }
  }
}

testSimpleRegistration().catch(console.error);
