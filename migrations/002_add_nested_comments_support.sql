-- Enhanced Nested Comments System Migration
-- This migration adds depth tracking and thread management to the existing review system

-- Step 1: Add new columns to track depth and thread relationships
ALTER TABLE product_reviews 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_root_id INTEGER DEFAULT NULL;

-- Step 2: Update existing records based on parent_id
-- Records with no parent (parent_id IS NULL) are depth 0
UPDATE product_reviews 
SET depth = 0
WHERE parent_id IS NULL AND depth = 0;

-- For replies, we need to calculate depth recursively
-- This is a simplified approach - we set depth to 1 for any reply
UPDATE product_reviews 
SET depth = 1
WHERE parent_id IS NOT NULL AND depth = 0;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_thread_root ON product_reviews(thread_root_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_depth ON product_reviews(depth);
CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_product ON product_reviews(parent_id, product_id);

-- Step 4: Create a function to calculate comment depth recursively
CREATE OR REPLACE FUNCTION get_comment_depth(comment_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  parent_id_val INTEGER;
  parent_depth INTEGER;
BEGIN
  SELECT parent_id INTO parent_id_val FROM product_reviews WHERE id = comment_id;
  
  IF parent_id_val IS NULL THEN
    RETURN 0;
  ELSE
    SELECT depth INTO parent_depth FROM product_reviews WHERE id = parent_id_val;
    RETURN COALESCE(parent_depth, 0) + 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to set thread_root_id for all comments
CREATE OR REPLACE FUNCTION get_thread_root_id(comment_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_id INTEGER := comment_id;
  parent_id_val INTEGER;
BEGIN
  LOOP
    SELECT parent_id INTO parent_id_val FROM product_reviews WHERE id = current_id;
    
    IF parent_id_val IS NULL THEN
      RETURN current_id;
    END IF;
    
    current_id := parent_id_val;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update thread_root_id for all existing comments
UPDATE product_reviews 
SET thread_root_id = get_thread_root_id(id)
WHERE thread_root_id IS NULL;

-- Step 7: Create trigger to automatically calculate depth on insert
CREATE OR REPLACE FUNCTION set_comment_depth_and_root()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_root_id INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent's depth
    SELECT depth INTO parent_depth FROM product_reviews WHERE id = NEW.parent_id;
    
    -- Check max depth (3 levels: 0, 1, 2)
    IF COALESCE(parent_depth, 0) >= 2 THEN
      RAISE EXCEPTION 'Cannot nest comments more than 3 levels deep';
    END IF;
    
    -- Set new comment's depth
    NEW.depth = COALESCE(parent_depth, 0) + 1;
    
    -- Set thread_root_id to parent's thread root
    SELECT thread_root_id INTO parent_root_id FROM product_reviews WHERE id = NEW.parent_id;
    NEW.thread_root_id = COALESCE(parent_root_id, NEW.parent_id);
  ELSE
    -- Top-level comment
    NEW.depth = 0;
    NEW.thread_root_id = NEW.id; -- Will be updated after insert
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_comment_depth_and_root ON product_reviews;

-- Create the trigger
CREATE TRIGGER trigger_set_comment_depth_and_root
BEFORE INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION set_comment_depth_and_root();

-- Step 8: Create trigger to update thread_root_id for new top-level comments
CREATE OR REPLACE FUNCTION update_thread_root_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE product_reviews SET thread_root_id = NEW.id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_root_on_insert ON product_reviews;

CREATE TRIGGER trigger_update_thread_root_on_insert
AFTER INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_thread_root_on_insert();

-- Step 9: Add comment to document the enhancement
COMMENT ON COLUMN product_reviews.depth IS 'Nesting level: 0 = top-level review, 1-2 = nested comments, max 3 levels';
COMMENT ON COLUMN product_reviews.thread_root_id IS 'References the top-level review that starts this thread for efficient querying';

-- Verify the migration
SELECT 
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN depth = 0 THEN 1 END) as top_level,
  COUNT(CASE WHEN depth = 1 THEN 1 END) as level_1_replies,
  COUNT(CASE WHEN depth = 2 THEN 1 END) as level_2_replies,
  COUNT(CASE WHEN depth >= 3 THEN 1 END) as exceeds_max_depth
FROM product_reviews;
