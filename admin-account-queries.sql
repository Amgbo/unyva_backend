-- ====================================
-- ADMIN ACCOUNT STATUS QUERIES
-- ====================================
-- Use these queries to verify admin permissions
-- Admin ID: 22243185
-- ====================================

-- Query 1: View Complete Admin Account Profile
-- Shows all role permissions and ratings
SELECT 
  student_id,
  first_name,
  last_name,
  email,
  role,
  is_verified,
  registration_complete,
  '--- SELLER INFO ---' as section1,
  is_active_seller,
  seller_rating,
  seller_review_count,
  '--- SERVICE PROVIDER INFO ---' as section2,
  is_active_service_provider,
  service_provider_rating,
  service_review_count,
  '--- DELIVERY INFO ---' as section3,
  is_delivery_approved,
  delivery_code,
  delivery_rating,
  delivery_review_count,
  '--- PROFILE ---' as section4,
  profile_completion_score,
  created_at
FROM students
WHERE student_id = '22243185';

-- Query 2: Count admin's products (if any)
-- Shows how many products admin has posted
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available_products,
  COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_products,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_products
FROM products
WHERE student_id = '22243185';

-- Query 3: Count admin's services
-- Shows how many services admin has posted
SELECT 
  COUNT(*) as total_services,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available_services,
  COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_services,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_services
FROM services
WHERE student_id = '22243185';

-- Query 4: Count admin's orders as buyer
-- Shows orders placed by admin
SELECT 
  COUNT(*) as total_orders_as_buyer,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
  SUM(total_price) as total_spent
FROM orders
WHERE customer_id = '22243185';

-- Query 5: Count admin's sales (as seller)
-- Shows products sold by admin
SELECT 
  COUNT(*) as total_sales,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_sales,
  SUM(total_price) as total_revenue
FROM orders
WHERE seller_id = '22243185';

-- Query 6: Count admin's deliveries
-- Shows deliveries completed by admin
SELECT 
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deliveries,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_deliveries,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deliveries,
  SUM(delivery_fee) as total_delivery_earnings
FROM deliveries
WHERE delivery_person_id = '22243185';

-- Query 7: Check admin's reviews
-- Shows reviews received across all roles
SELECT 
  'Product Seller' as role_type,
  (SELECT COUNT(*) FROM product_reviews WHERE product_id IN 
    (SELECT id FROM products WHERE student_id = '22243185')) as review_count,
  (SELECT AVG(rating) FROM product_reviews WHERE product_id IN 
    (SELECT id FROM products WHERE student_id = '22243185')) as avg_rating
UNION ALL
SELECT 
  'Service Provider' as role_type,
  (SELECT COUNT(*) FROM service_reviews WHERE provider_id = '22243185') as review_count,
  (SELECT AVG(rating) FROM service_reviews WHERE provider_id = '22243185' AND parent_id IS NULL) as avg_rating
UNION ALL
SELECT 
  'Delivery Person' as role_type,
  (SELECT COUNT(*) FROM deliveries WHERE delivery_person_id = '22243185' AND rating IS NOT NULL) as review_count,
  (SELECT AVG(rating) FROM deliveries WHERE delivery_person_id = '22243185' AND rating IS NOT NULL) as avg_rating;

-- Query 8: Full permission matrix
-- Visual representation of all permissions
SELECT
  '22243185' as admin_id,
  CASE WHEN is_active_seller THEN '✅ YES' ELSE '❌ NO' END as can_sell_products,
  CASE WHEN is_active_service_provider THEN '✅ YES' ELSE '❌ NO' END as can_provide_services,
  CASE WHEN is_delivery_approved THEN '✅ YES' ELSE '❌ NO' END as can_deliver_orders,
  '✅ YES' as can_buy_products
FROM students
WHERE student_id = '22243185';

-- Query 9: Compare admin with regular users
-- Shows how admin differs from typical users
SELECT 
  'Admin (22243185)' as user_type,
  (SELECT COUNT(*) FROM students WHERE is_active_seller = TRUE) as active_sellers,
  (SELECT COUNT(*) FROM students WHERE is_active_service_provider = TRUE) as active_providers,
  (SELECT COUNT(*) FROM students WHERE is_delivery_approved = TRUE) as approved_deliverers,
  (SELECT COUNT(*) FROM products) as total_products,
  (SELECT COUNT(*) FROM services) as total_services,
  (SELECT COUNT(*) FROM orders) as total_orders
FROM students
WHERE student_id = '22243185'
LIMIT 1;

-- Query 10: Admin activity timeline
-- Shows when admin account was created
SELECT 
  student_id,
  first_name,
  last_name,
  created_at as account_created,
  last_active,
  EXTRACT(DAY FROM NOW() - created_at) as days_active,
  is_verified,
  registration_complete
FROM students
WHERE student_id = '22243185';

-- ====================================
-- QUICK VERIFICATION
-- Run this single query to check all permissions at once
-- ====================================

SELECT 
  'Admin Status' as check_type,
  CASE 
    WHEN is_active_seller AND is_active_service_provider AND is_delivery_approved 
    THEN '✅ FULLY CONFIGURED' 
    ELSE '⚠️ INCOMPLETE' 
  END as status,
  is_active_seller as seller_enabled,
  is_active_service_provider as service_provider_enabled,
  is_delivery_approved as delivery_enabled,
  seller_rating,
  service_provider_rating,
  delivery_rating
FROM students
WHERE student_id = '22243185';
