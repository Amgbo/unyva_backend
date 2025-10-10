import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const API_BASE_URL = 'http://localhost:5000/api';

async function testProfileUpdate() {
  try {
    console.log('🔄 Testing profile update with FormData...');

    // First, login to get token
    const loginResponse = await axios.post(`${API_BASE_URL}/students/login`, {
      student_id: 'TEST001',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // First test: Get current profile to verify authentication
    console.log('📤 Testing profile GET request...');

    try {
      const getResponse = await axios.get(`${API_BASE_URL}/students/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Profile GET successful!');
      console.log('📋 Current student data:', getResponse.data.student);

    } catch (error: any) {
      console.error('❌ Profile GET failed:', error.response?.data || error.message);
      return; // Exit if authentication fails
    }

    // Second test: Update profile with just one field to debug
    console.log('📤 Testing profile update with just first_name...');

    const FormData = require('form-data');
    const formDataMinimal = new FormData();

    formDataMinimal.append('first_name', 'Updated First Name');

    try {
      const updateResponse = await axios.put(`${API_BASE_URL}/students/profile`, formDataMinimal, {
        headers: {
          ...formDataMinimal.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Profile updated successfully with minimal data!');
      console.log('📋 Updated student data:', updateResponse.data.student);

    } catch (error: any) {
      console.error('❌ Profile update with minimal data failed:', error.response?.data || error.message);
      console.error('Full error response:', error.response);
      return; // Exit if basic update fails
    }

    // Third test: Update profile without file upload - send as multipart/form-data with no files
    console.log('📤 Testing profile update without file (multipart/form-data)...');

    const formDataNoFile = new FormData();

    formDataNoFile.append('first_name', 'Updated First Name');
    formDataNoFile.append('last_name', 'Updated Last Name');
    formDataNoFile.append('phone', '+1234567890');
    formDataNoFile.append('gender', 'male');
    formDataNoFile.append('hall_of_residence', 'Hall A');
    formDataNoFile.append('room_number', '101');

    try {
      const updateResponse = await axios.put(`${API_BASE_URL}/students/profile`, formDataNoFile, {
        headers: {
          ...formDataNoFile.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Profile updated successfully without file!');
      console.log('📋 Updated student data:', updateResponse.data.student);

    } catch (error: any) {
      console.error('❌ Profile update without file failed:', error.response?.data || error.message);
      return; // Exit if basic update fails
    }

    // Second test: Update profile with file upload
    console.log('📤 Testing profile update with file...');

    // Create FormData for profile update
    const formData = new FormData();

    // Add text fields
    formData.append('first_name', 'Updated First Name With File');
    formData.append('last_name', 'Updated Last Name With File');

    // Add profile picture (create a dummy file if it doesn't exist)
    const dummyImagePath = path.join(process.cwd(), 'test-image.jpg');
    if (!fs.existsSync(dummyImagePath)) {
      // Create a simple dummy image file
      const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(dummyImagePath, dummyImageBuffer);
    }

    formData.append('profile_picture', fs.createReadStream(dummyImagePath), {
      filename: 'test-profile.jpg',
      contentType: 'image/jpeg'
    });

    console.log('📤 Sending profile update request with file...');

    // Update profile with file
    const updateResponse = await axios.put(`${API_BASE_URL}/students/profile`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Profile updated successfully!');
    console.log('📋 Updated student data:', updateResponse.data.student);

    // Clean up dummy file
    if (fs.existsSync(dummyImagePath)) {
      fs.unlinkSync(dummyImagePath);
    }

  } catch (error: any) {
    console.error('❌ Profile update test failed:', error.response?.data || error.message);
  }
}

// Run the test
testProfileUpdate();
