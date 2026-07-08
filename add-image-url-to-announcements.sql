-- Add image_url column to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN announcements.image_url IS 'Optional URL of the announcement image stored in ImageKit';

-- Create index for image_url if needed (though unlikely to be queried often)
-- CREATE INDEX IF NOT EXISTS idx_announcements_image_url ON announcements(image_url);
