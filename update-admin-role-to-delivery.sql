-- ====================================
-- UPDATE ADMIN ROLE TO ENABLE DELIVERY
-- ====================================
-- Admin ID: 22243185
-- Purpose: Change admin role from 'buyer_seller' to 'delivery'
-- This allows the admin to perform deliveries for their own items
-- ====================================

-- Update the admin account role to 'delivery'
UPDATE students
SET
  role = 'delivery'
WHERE student_id = '22243185';

-- Verify the update
SELECT
  student_id,
  first_name,
  last_name,
  role,
  is_active_seller,
  is_active_service_provider,
  is_delivery_approved,
  delivery_code,
  is_verified
FROM students
WHERE student_id = '22243185';

-- ====================================
-- UPDATE COMPLETE
-- ====================================
-- The admin account 22243185 now has:
-- ✅ Role: 'delivery' (can perform deliveries)
-- ✅ Can BUY products (default for all users)
-- ✅ Can SELL products (is_active_seller = true)
-- ✅ Can PROVIDE SERVICES (is_active_service_provider = true)
-- ✅ Can DELIVER items (is_delivery_approved = true, delivery_code = ADMIN-22243185)
-- ====================================
