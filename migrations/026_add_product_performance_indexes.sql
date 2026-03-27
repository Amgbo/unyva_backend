-- 026_add_product_performance_indexes.sql
-- Purpose: Improve product list/feed/search query performance under growth.

BEGIN;

-- Speeds up home feed and generic product list ordering.
CREATE INDEX IF NOT EXISTS idx_products_home_feed_bumped
ON products (last_bumped_at DESC)
WHERE is_approved = true
  AND status IN ('available', 'sold', 'pending');

-- Speeds up in-stock product feed queries.
CREATE INDEX IF NOT EXISTS idx_products_home_feed_instock_bumped
ON products (last_bumped_at DESC)
WHERE is_approved = true
  AND quantity > 0
  AND status IN ('available', 'sold', 'pending');

-- Speeds up category-specific listing queries.
CREATE INDEX IF NOT EXISTS idx_products_category_feed_bumped
ON products (category, last_bumped_at DESC)
WHERE is_approved = true
  AND quantity > 0
  AND status IN ('available', 'sold', 'pending');

-- Speeds up seller-centric listing/grouping queries.
CREATE INDEX IF NOT EXISTS idx_products_student_status_bumped
ON products (student_id, status, last_bumped_at DESC);

-- Speeds up product + images aggregation joins and deterministic image ordering.
CREATE INDEX IF NOT EXISTS idx_product_images_product_upload_order
ON product_images (product_id, upload_order);

COMMIT;
