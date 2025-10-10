-- ============================
-- PRODUCT REVIEWS NESTED REPLIES MIGRATION
-- ============================

-- Add parent_id column for nested replies
ALTER TABLE product_reviews ADD COLUMN parent_id INTEGER REFERENCES product_reviews(id) ON DELETE CASCADE;

-- Make rating nullable for replies (only required for top-level reviews)
ALTER TABLE product_reviews ALTER COLUMN rating DROP NOT NULL;

-- Remove UNIQUE constraint on (product_id, student_id) since one student may write multiple replies
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_student_id_key;

-- Add updated_at column if it doesn't exist
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_reviews_updated_at();

-- Add indexes for better performance with nested queries
CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_id ON product_reviews(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_product_reviews_updated_at ON product_reviews(updated_at);
