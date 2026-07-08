-- Fix cart table constraints to use composite UNIQUE instead of individual UNIQUE

-- Drop the incorrect individual UNIQUE constraints
ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_student_id_key;
ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_product_id_key;

-- Add the correct composite UNIQUE constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cart_student_id_product_id_key'
        AND conrelid = 'cart'::regclass
    ) THEN
        ALTER TABLE cart ADD CONSTRAINT cart_student_id_product_id_key UNIQUE (student_id, product_id);
    END IF;
END $$;
