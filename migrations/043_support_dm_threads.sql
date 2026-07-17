-- Migration: Support direct message threads in companion_messages
-- Changes booking_id from UUID to TEXT to allow both booking UUIDs and DM thread IDs (dm:userA:userB)

-- Drop the foreign key constraint first
ALTER TABLE companion_messages DROP CONSTRAINT IF EXISTS companion_messages_booking_id_fkey;

-- Change booking_id from UUID to TEXT
ALTER TABLE companion_messages ALTER COLUMN booking_id TYPE TEXT;

-- Add a column to distinguish message types (optional but useful for queries)
ALTER TABLE companion_messages ADD COLUMN IF NOT EXISTS thread_type TEXT DEFAULT 'booking'
  CHECK (thread_type IN ('booking', 'dm'));

-- Create index for DM thread lookups
CREATE INDEX IF NOT EXISTS idx_cmsg_thread_type ON companion_messages(thread_type);
CREATE INDEX IF NOT EXISTS idx_cmsg_receiver_thread ON companion_messages(receiver_id, thread_type);

-- Update existing rows to have thread_type = 'booking'
UPDATE companion_messages SET thread_type = 'booking' WHERE thread_type IS NULL;