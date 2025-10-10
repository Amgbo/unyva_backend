import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test data
const testStudent = {
  student_id: '12345678',
  first_name: 'Test',
  last_name: 'Student',
  email: 'test@example.com',
  password: 'password123',
  phone: '1234567890',
  gender: 'Male',
  date_of_birth: '15-05-1995',
  hall_of_residence: 'Test Hall',
  room_number: '101'
};

const testProduct = {
  title: 'Test Product',
  description: 'A test product for review testing',
  price: 100,
  category: 'Electronics',
  condition: 'new',
  contact_method: 'WhatsApp',
  image_urls: ['test-image.jpg']
};

let authToken = '';
let productId = 1; // Use existing product ID 1 (Laptop)
let reviewId = 0;

async function login() {
  console.log('🔐 Logging in test student...');
  try {
    const response = await fetch(`${BASE_URL}/api/students/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: testStudent.student_id,
        password: testStudent.password
      })
    });

    if (!response.ok) {
      console.log('Login failed, trying to register...');
      await register();
      return login();
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Login successful');
  } catch (error) {
    console.error('❌ Login error:', error);
  }
}

async function register() {
  console.log('📝 Registering test student...');

  // Step 1: Basic registration
  try {
    const step1Data = {
      student_id: testStudent.student_id,
      first_name: testStudent.first_name,
      last_name: testStudent.last_name,
      email: testStudent.email,
      phone: testStudent.phone,
      gender: testStudent.gender,
      date_of_birth: testStudent.date_of_birth,
      hall_of_residence: testStudent.hall_of_residence,
      room_number: testStudent.room_number
    };

    const response1 = await fetch(`${BASE_URL}/api/students/register-step1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(step1Data)
    });

    const data1 = await response1.json();
    if (response1.ok) {
      console.log('✅ Step 1 registration successful');
    } else {
      console.log('❌ Step 1 registration failed:', data1);
      return;
    }
  } catch (error) {
    console.error('❌ Step 1 registration error:', error);
    return;
  }

  // Step 2: Set password
  try {
    const step2Data = {
      student_id: testStudent.student_id,
      password: testStudent.password,
      confirmPassword: testStudent.password
    };

    const response2 = await fetch(`${BASE_URL}/api/students/register-step2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(step2Data)
    });

    const data2 = await response2.json();
    if (response2.ok) {
      console.log('✅ Step 2 registration successful');
    } else {
      console.log('❌ Step 2 registration failed:', data2);
    }
  } catch (error) {
    console.error('❌ Step 2 registration error:', error);
  }
}

async function createTestProduct() {
  console.log('📦 Creating test product...');
  try {
    const response = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testProduct)
    });

    const data = await response.json();
    if (response.ok) {
      productId = data.product.id;
      console.log('✅ Product created with ID:', productId);
    } else {
      console.log('❌ Product creation failed:', data);
    }
  } catch (error) {
    console.error('❌ Product creation error:', error);
  }
}

async function testCreateReview() {
  console.log('⭐ Creating a top-level review...');
  try {
    const response = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        product_id: productId,
        rating: 5,
        title: 'Great product!',
        comment: 'This is an excellent product. Highly recommended!',
        order_id: null
      })
    });

    const data = await response.json();
    if (response.ok) {
      reviewId = data.id;
      console.log('✅ Review created with ID:', reviewId);
    } else {
      console.log('❌ Review creation failed:', data);
    }
  } catch (error) {
    console.error('❌ Review creation error:', error);
  }
}

async function testCreateReply() {
  console.log('💬 Creating a reply to the review...');
  try {
    const response = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        product_id: productId,
        comment: 'Thank you for the feedback! We appreciate your support.',
        parent_id: reviewId
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Reply created with ID:', data.id);
    } else {
      console.log('❌ Reply creation failed:', data);
    }
  } catch (error) {
    console.error('❌ Reply creation error:', error);
  }
}

async function testGetReviews() {
  console.log('📖 Getting reviews for product...');
  try {
    const response = await fetch(`${BASE_URL}/api/reviews/${productId}`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Reviews fetched successfully');
      console.log('📊 Reviews count:', data.reviews.length);
      console.log('📄 Has more:', data.hasMore);
      console.log('📝 Total:', data.total);

      if (data.reviews.length > 0) {
        console.log('🔍 First review:', {
          id: data.reviews[0].id,
          rating: data.reviews[0].rating,
          title: data.reviews[0].title,
          comment: data.reviews[0].comment,
          repliesCount: data.reviews[0].replies ? data.reviews[0].replies.length : 0
        });
      }
    } else {
      console.log('❌ Reviews fetch failed:', data);
    }
  } catch (error) {
    console.error('❌ Reviews fetch error:', error);
  }
}

async function testCanUserReview() {
  console.log('🔍 Checking if user can review product...');
  try {
    const response = await fetch(`${BASE_URL}/api/reviews/${productId}/can-review`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Can review check:', data.canReview);
    } else {
      console.log('❌ Can review check failed:', data);
    }
  } catch (error) {
    console.error('❌ Can review check error:', error);
  }
}

async function testGetUserReview() {
  console.log('👤 Getting user\'s review for product...');
  try {
    const response = await fetch(`${BASE_URL}/api/reviews/${productId}/user-review`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      if (data.review) {
        console.log('✅ User review found:', {
          id: data.review.id,
          rating: data.review.rating,
          title: data.review.title
        });
      } else {
        console.log('ℹ️  No user review found');
      }
    } else {
      console.log('❌ User review fetch failed:', data);
    }
  } catch (error) {
    console.error('❌ User review fetch error:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting review endpoints tests...\n');

  await login();
  if (!authToken) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('📦 Using existing product ID:', productId);

  await testCanUserReview();
  await testCreateReview();
  await testCreateReply();
  await testGetReviews();
  await testGetUserReview();

  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);
