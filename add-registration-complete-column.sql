-- Add registration_complete column to students table
-- This allows incomplete registrations to be overwritten

ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT FALSE;

-- Update existing records to be considered complete if they have password set
UPDATE students SET registration_complete = TRUE WHERE password IS NOT NULL AND password != '';

-- Add comment to the column
COMMENT ON COLUMN students.registration_complete IS 'Indicates if student registration is fully complete (Step 1 + Step 2)';

psql "postgresql://neondb_owner:npg_ZvSs5lG4EHCd@ep-withered-hat-addwuvmg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" -f add-registration-complete-column.sql
