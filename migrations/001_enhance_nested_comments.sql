-- Enhanced Nested Comments System - Migration for existing my_unyva_db
-- This migration enhances the existing product_reviews table with depth tracking
-- The existing table already has parent_id for nested replies, we're adding depth support

-- Step 1: Add depth and thread_root_id columns to existing product_reviews table
ALTER TABLE product_reviews 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_root_id INTEGER DEFAULT NULL;

-- Step 2: Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_thread_root ON product_reviews(thread_root_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_depth ON product_reviews(depth);
CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_product ON product_reviews(parent_id, product_id);

-- Step 3: Calculate depth for existing records (0 = top-level, 1+ = nested)
UPDATE product_reviews 
SET depth = 0
WHERE parent_id IS NULL AND depth = 0;

-- Set depth to 1 for first-level replies
UPDATE product_reviews pr1
SET depth = 1
WHERE parent_id IS NOT NULL 
AND depth = 0
AND NOT EXISTS (
  SELECT 1 FROM product_reviews pr2 
  WHERE pr2.id = pr1.parent_id AND pr2.parent_id IS NOT NULL
);

-- Set depth to 2 for second-level replies
UPDATE product_reviews pr1
SET depth = 2
WHERE parent_id IS NOT NULL 
AND depth = 0
AND EXISTS (
  SELECT 1 FROM product_reviews pr2 
  WHERE pr2.id = pr1.parent_id AND pr2.parent_id IS NOT NULL
);

-- Step 4: Set thread_root_id for all records
-- For top-level reviews, thread_root_id = id
UPDATE product_reviews 
SET thread_root_id = id
WHERE parent_id IS NULL AND thread_root_id IS NULL;

-- For first-level replies, thread_root_id = parent_id
UPDATE product_reviews pr1
SET thread_root_id = pr1.parent_id
WHERE pr1.parent_id IS NOT NULL 
AND pr1.depth = 1
AND pr1.thread_root_id IS NULL;

-- For nested replies, find the root through parent chain
WITH RECURSIVE root_finder AS (
  SELECT id, parent_id, id as root_id
  FROM product_reviews
  WHERE parent_id IS NOT NULL AND depth = 2
  
  UNION ALL
  
  SELECT rf.id, pr.parent_id, 
    CASE WHEN pr.parent_id IS NULL THEN pr.id ELSE rf.root_id END
  FROM root_finder rf
  JOIN product_reviews pr ON pr.id = rf.parent_id
  WHERE pr.id IS NOT NULL
)
UPDATE product_reviews
SET thread_root_id = (
  SELECT root_id FROM root_finder WHERE root_finder.id = product_reviews.id LIMIT 1
)
WHERE product_reviews.thread_root_id IS NULL AND product_reviews.depth > 1;

-- Step 5: Create function to calculate comment depth
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

-- Step 6: Create trigger to validate and set depth on new inserts
CREATE OR REPLACE FUNCTION validate_and_set_comment_depth()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_root_id INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent's depth
    SELECT depth INTO parent_depth FROM product_reviews WHERE id = NEW.parent_id;
    
    -- Check max depth (3 levels: 0, 1, 2 where 2 is max)
    IF COALESCE(parent_depth, 0) >= 2 THEN
      RAISE EXCEPTION 'Cannot nest comments more than 3 levels deep';
    END IF;
    
    -- Set new comment's depth
    NEW.depth = COALESCE(parent_depth, 0) + 1;
    
    -- Set thread_root_id
    SELECT thread_root_id INTO parent_root_id FROM product_reviews WHERE id = NEW.parent_id;
    NEW.thread_root_id = COALESCE(parent_root_id, NEW.parent_id);
  ELSE
    -- Top-level comment
    NEW.depth = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_validate_comment_depth ON product_reviews;

-- Create the trigger
CREATE TRIGGER trigger_validate_comment_depth
BEFORE INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION validate_and_set_comment_depth();

-- Step 7: Create trigger to set thread_root_id for top-level comments after insert
CREATE OR REPLACE FUNCTION set_thread_root_for_toplevel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE product_reviews SET thread_root_id = NEW.id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_thread_root_after_insert ON product_reviews;

CREATE TRIGGER trigger_set_thread_root_after_insert
AFTER INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION set_thread_root_for_toplevel();

-- Step 8: Add comments to document the schema
COMMENT ON COLUMN product_reviews.depth IS 'Nesting level: 0 = top-level review, 1-2 = nested comments/replies (max 3 levels)';
COMMENT ON COLUMN product_reviews.thread_root_id IS 'References the top-level review ID that starts this thread for efficient querying';
COMMENT ON COLUMN product_reviews.parent_id IS 'References the parent review/comment, NULL for top-level reviews';

-- Step 9: Verify the migration worked correctly
SELECT 
  'Migration Summary' as check_name,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN depth = 0 THEN 1 END) as top_level_reviews,
  COUNT(CASE WHEN depth = 1 THEN 1 END) as level_1_replies,
  COUNT(CASE WHEN depth = 2 THEN 1 END) as level_2_replies,
  COUNT(CASE WHEN depth >= 3 THEN 1 END) as exceeds_max_depth
FROM product_reviews;

-- Verify no records exceed max depth
SELECT 
  'Depth Validation' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS - No records exceed max depth'
    ELSE 'FAIL - ' || COUNT(*) || ' records exceed max depth'
  END as result
FROM product_reviews
WHERE depth > 2;
