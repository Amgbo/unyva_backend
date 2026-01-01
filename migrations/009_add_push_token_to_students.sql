-- Migration: Add push_token column to students table for push notifications
-- Date: 2024
-- Description: Add push_token column to store Expo push tokens for push notifications

-- Add push_token column to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add updated_at column to students table if it doesn't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for performance when querying by push_token
CREATE INDEX IF NOT EXISTS idx_students_push_token ON students(push_token) WHERE push_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN students.push_token IS 'Expo push token for sending push notifications to the user';
COMMENT ON COLUMN students.updated_at IS 'Timestamp when student record was last updated';
