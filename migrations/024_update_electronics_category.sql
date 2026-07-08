-- Update existing products with category 'Electronics' to 'Electronics & Gadgets'
UPDATE products
SET category = 'Electronics & Gadgets'
WHERE category = 'Electronics';

-- Add comment for documentation
COMMENT ON MIGRATION '024_update_electronics_category.sql' IS 'Updated existing Electronics category products to Electronics & Gadgets';
