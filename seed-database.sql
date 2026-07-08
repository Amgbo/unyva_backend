-- Seed Database with Sample Users and Products
-- This script adds sample data for testing App Store review

-- ============================================
-- 1. SEED SAMPLE USERS
-- ============================================

-- Sample Buyer/Seller 1
INSERT INTO students (student_id, first_name, last_name, email, password, phone, gender, date_of_birth, hall_of_residence, room_number, role, university, program, graduation_year, profile_picture, id_card, is_verified, rating, total_ratings, is_active_seller, seller_rating, seller_review_count, created_at)
VALUES (
  '99999999',
  'John',
  'Doe',
  'john.doe.seed@university.edu',
  '$2b$10$YIjhJ5L8V1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z',
  '+233201234567',
  'Male',
  '2001-05-15',
  'Commonwealth Hall',
  'A101',
  'buyer_seller',
  'University of Ghana',
  'Computer Science',
  2025,
  'https://via.placeholder.com/150?text=John',
  'https://via.placeholder.com/150?text=ID1',
  TRUE,
  5.0,
  10,
  TRUE,
  4.8,
  8,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Sample Buyer/Seller 2
INSERT INTO students (student_id, first_name, last_name, email, password, phone, gender, date_of_birth, hall_of_residence, room_number, role, university, program, graduation_year, profile_picture, id_card, is_verified, rating, total_ratings, is_active_seller, seller_rating, seller_review_count, created_at)
VALUES (
  '23232323',
  'Jane',
  'Smith',
  'jane.smith.seed@university.edu',
  '$2b$10$YIjhJ5L8V1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z',
  '+233209876543',
  'Female',
  '2002-08-20',
  'Legon Hall',
  'B205',
  'buyer_seller',
  'University of Ghana',
  'Business Administration',
  2026,
  'https://via.placeholder.com/150?text=Jane',
  'https://via.placeholder.com/150?text=ID2',
  TRUE,
  4.9,
  12,
  TRUE,
  4.7,
  10,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Sample Delivery Person
INSERT INTO students (student_id, first_name, last_name, email, password, phone, gender, date_of_birth, hall_of_residence, room_number, role, delivery_code, is_verified, rating, total_ratings, delivery_rating, delivery_review_count, is_delivery_approved, created_at)
VALUES (
  '13131313',
  'Samuel',
  'Kwame',
  'samuel.kwame@university.edu',
  '$2b$10$YIjhJ5L8V1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z',
  '+233503456789',
  'Male',
  '2003-03-10',
  'Volta Hall',
  'C310',
  'delivery',
  'UNYVA-DELIVER-001',
  TRUE,
  4.9,
  25,
  4.9,
  25,
  TRUE,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Sample Delivery Person 2
INSERT INTO students (student_id, first_name, last_name, email, password, phone, gender, date_of_birth, hall_of_residence, room_number, role, delivery_code, is_verified, rating, total_ratings, delivery_rating, delivery_review_count, is_delivery_approved, created_at)
VALUES (
  '14141414',
  'Ama',
  'Mensah',
  'ama.mensah.seed@university.edu',
  '$2b$10$YIjhJ5L8V1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z',
  '+233557890123',
  'Female',
  '2002-12-22',
  'Akuafo Hall',
  'D415',
  'delivery',
  'UNYVA-DELIVER-002',
  TRUE,
  5.0,
  18,
  5.0,
  18,
  TRUE,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. SEED SAMPLE PRODUCTS
-- ============================================

-- Product 1: Laptop (by John Doe)
INSERT INTO products (title, description, price, student_id, category, condition, contact_method, hall_id, room_number, tags, rating, review_count, quantity, created_at)
SELECT
  'Dell XPS 13 Laptop',
  'Lightly used Dell XPS 13 laptop in excellent condition. Very fast, perfect for studies and coding.',
  2500.00,
  '99999999',
  'Electronics',
  'Used',
  'in_app',
  1,
  'A101',
  ARRAY['laptop', 'dell', 'electronics', 'computer'],
  4.8,
  5,
  1,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Dell XPS 13 Laptop');

-- Product 2: Textbooks (by Jane Smith)
INSERT INTO products (title, description, price, student_id, category, condition, contact_method, hall_id, room_number, tags, rating, review_count, quantity, created_at)
SELECT
  'Advanced Calculus & Linear Algebra Textbooks',
  'Set of 2 textbooks for MATH 201 and MATH 301. Condition: Good. Minimal highlighting.',
  150.00,
  '23232323',
  'Books',
  'Good',
  'in_app',
  2,
  'B205',
  ARRAY['textbooks', 'mathematics', 'books', 'study'],
  4.9,
  8,
  2,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Advanced Calculus & Linear Algebra Textbooks');

-- Product 3: Kitchen Items (by John Doe)
INSERT INTO products (title, description, price, seller_id, category_id, condition, image_urls, hall_id, room_number, tags, rating, total_ratings, available_quantity, created_at)
SELECT
  'Portable Mini Fridge',
  'Compact mini fridge, perfect for dorm rooms. Works great, very quiet. Color: Silver.',
  250.00,
  '13131313',
  (SELECT id FROM categories WHERE name = 'Home & Living' LIMIT 1),
  'Like New',
  ARRAY['https://via.placeholder.com/300?text=Fridge1'],
  1,
  'A101',
  ARRAY['fridge', 'kitchen', 'home', 'dorm'],
  5.0,
  3,
  1,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Portable Mini Fridge');

-- Product 4: Headphones (by Jane Smith)
INSERT INTO products (title, description, price, student_id, category, condition, contact_method, hall_id, room_number, tags, rating, review_count, quantity, created_at)
SELECT
  'Sony WH-1000XM4 Headphones',
  'Premium noise-canceling headphones. Excellent sound quality. Battery life: 30 hours. Original box included.',
  800.00,
  '14141414',
  'Electronics',
  'Excellent',
  'in_app',
  2,
  'B205',
  ARRAY['headphones', 'sony', 'audio', 'electronics'],
  4.9,
  10,
  1,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Sony WH-1000XM4 Headphones');

-- Product 5: Sports Equipment (by John Doe)
INSERT INTO products (title, description, price, student_id, category, condition, contact_method, hall_id, room_number, tags, rating, review_count, quantity, created_at)
SELECT
  'Basketball & Shoes Bundle',
  'Official basketball + Nike basketball shoes (Size 10). Both in perfect condition.',
  180.00,
  '13131313',
  'Sports & Outdoors',
  'New',
  'in_app',
  1,
  'A101',
  ARRAY['basketball', 'sports', 'shoes', 'nike'],
  5.0,
  4,
  1,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM products WHERE title = 'Basketball & Shoes Bundle');

-- ============================================
-- 3. SEED SAMPLE SERVICES
-- ============================================

-- Service 1: Tutoring (by Jane Smith)
INSERT INTO services (title, description, seller_id, hourly_rate, rating, total_ratings, is_available, created_at)
SELECT
  'Mathematics Tutoring',
  'Expert tutoring for MATH 101, 201, 301. Also help with assignment & exam prep. Experience: 3+ years.',
  '14141414',
  50.00,
  4.9,
  7,
  TRUE,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Mathematics Tutoring');

-- Service 2: Freelance Design (by John Doe)
INSERT INTO services (title, description, student_id, price, rating, review_count, is_available, created_at)
SELECT
  'Graphic Design & Logo Creation',
  'Professional graphics design services. Logo design, posters, social media content. Fast turnaround!',
  '23232323',
  75.00,
  4.8,
  5,
  TRUE,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = 'Graphic Design & Logo Creation');

-- ============================================
-- 4. SEED SAMPLE ANNOUNCEMENTS
-- ============================================

INSERT INTO announcements (title, content, created_by, created_at)
SELECT
  'Welcome to Unyva Marketplace!',
  'Browse and buy products from fellow students. Sell your used items easily. Join our community today!',
  '22243185',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Welcome to Unyva Marketplace!');

INSERT INTO announcements (title, content, created_by, created_at)
SELECT
  'New Delivery Service Available',
  'Fast and reliable delivery service for all your purchases. Track your orders in real-time!',
  '22243185',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'New Delivery Service Available');

-- ============================================
-- 5. SEED SAMPLE ORDERS
-- ============================================

-- Order 1: Laptop purchase
INSERT INTO orders (order_number, customer_id, seller_id, product_id, quantity, total_price, delivery_fee, delivery_hall_id, status, created_at)
SELECT
  'ORD-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-001',
  '23232323',
  '99999999',
  (SELECT id FROM products WHERE title = 'Dell XPS 13 Laptop' LIMIT 1),
  1,
  2500.00,
  50.00,
  2,
  'completed',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'ORD-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-001');

-- ============================================
-- 6. SEED SAMPLE PRODUCT REVIEWS
-- ============================================

INSERT INTO product_reviews (product_id, student_id, rating, comment, is_verified, created_at)
SELECT
  (SELECT id FROM products WHERE title = 'Dell XPS 13 Laptop' LIMIT 1),
  '23232323',
  5,
  'Excellent product! Very fast and reliable. Seller was very responsive.',
  TRUE,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM product_reviews WHERE product_id = (SELECT id FROM products WHERE title = 'Dell XPS 13 Laptop' LIMIT 1) AND student_id = '23232323');

-- ============================================
-- CONFIRMATION
-- ============================================
SELECT 'Seed data inserted successfully!' as status;

















