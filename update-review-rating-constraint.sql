-- Update the rating check constraint to allow 0 for replies
ALTER TABLE product_reviews
DROP CONSTRAINT IF EXISTS product_reviews_rating_check;

ALTER TABLE product_reviews
ADD CONSTRAINT product_reviews_rating_check
CHECK (rating >= 0 AND rating <= 5);
