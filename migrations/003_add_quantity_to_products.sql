-- Migration: Add quantity column to products table
-- Date: December 2024
-- Purpose: Implement stock/quantity management for products

-- Add quantity column with constraints
ALTER TABLE products
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 CHECK (quantity >= 0);

-- Add comment for documentation
COMMENT ON COLUMN products.quantity IS 'Stock quantity available for sale. Must be >= 0. Defaults to 1.';

-- Create index for efficient quantity queries
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);

-- Update existing products to have quantity = 1 if not set
UPDATE products SET quantity = 1 WHERE quantity IS NULL;

-- Optional: Add trigger to prevent negative quantities (additional safety)
CREATE OR REPLACE FUNCTION prevent_negative_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity < 0 THEN
        RAISE EXCEPTION 'Product quantity cannot be negative';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger for quantity validation
DROP TRIGGER IF EXISTS trigger_prevent_negative_quantity ON products;
CREATE TRIGGER trigger_prevent_negative_quantity
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_quantity();
