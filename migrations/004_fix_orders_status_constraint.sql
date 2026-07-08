-- Migration to fix orders status check constraint
-- Add 'assigned' and 'in_progress' to allowed statuses

-- Step 1: Update any orders with invalid statuses to 'confirmed'
UPDATE orders SET status = 'confirmed' WHERE status NOT IN ('confirmed', 'processing', 'assigned', 'in_progress', 'shipped', 'delivered', 'cancelled');

-- Step 2: Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 3: Add the updated constraint with additional statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('confirmed', 'processing', 'assigned', 'in_progress', 'shipped', 'delivered', 'cancelled'));
