-- Add rating and review_count columns to products table for product reviews summary

ALTER TABLE products
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
