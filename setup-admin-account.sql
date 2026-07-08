-- ====================================
-- SETUP ADMIN ACCOUNT WITH ALL ROLES
-- ====================================
-- Admin ID: 22243185
-- Purpose: Admin account that can perform ALL operations
-- - Buy products
-- - Sell products
-- - Provide services
-- - Deliver items
-- ====================================

-- Step 1: Update the admin account to have all permissions
UPDATE students
SET
  -- Make them an active seller
  is_active_seller = TRUE,
  seller_rating = 5.0,
  seller_review_count = 0,
  
  -- Make them an active service provider
  is_active_service_provider = TRUE,
  service_provider_rating = 5.0,
  service_review_count = 0,
  
  -- Make them approved for delivery
  is_delivery_approved = TRUE,
  delivery_code = 'ADMIN-22243185',
  delivery_rating = 5.0,
  delivery_review_count = 0,
  
  -- Set role to buyer_seller
  role = 'buyer_seller',
  
  -- Mark as verified
  is_verified = TRUE,
  
  -- Set profile completion
  registration_complete = TRUE,
  profile_completion_score = 100
WHERE student_id = '22243185';

-- Step 2: Verify the update
SELECT 
  student_id,
  first_name,
  last_name,
  role,
  is_active_seller,
  is_active_service_provider,
  is_delivery_approved,
  delivery_code,
  is_verified,
  seller_rating,
  service_provider_rating,
  delivery_rating
FROM students
WHERE student_id = '22243185';

-- Step 3: Log the change (optional - for audit trail)
-- You can add this to a tracking table if you have one
INSERT INTO delete_account_requests (full_name, student_id_or_email, deletion_message, submitted_at, status)
SELECT 
  CONCAT(first_name, ' ', last_name) as full_name,
  student_id,
  'ADMIN SETUP: Granted all permissions (buyer, seller, service provider, delivery)',
  CURRENT_TIMESTAMP,
  'approved'
FROM students
WHERE student_id = '22243185'
ON CONFLICT DO NOTHING;

-- ====================================
-- SETUP COMPLETE
-- ====================================
-- The admin account 22243185 now has:
-- ✅ Can BUY products (default for all users)
-- ✅ Can SELL products (is_active_seller = true)
-- ✅ Can PROVIDE SERVICES (is_active_service_provider = true)
-- ✅ Can DELIVER items (is_delivery_approved = true, delivery_code = ADMIN-22243185)
-- ====================================
