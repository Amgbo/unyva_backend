-- Hotspot Feature - Reverse Geocoding Enrichment
-- Adds Google-resolved place labels alongside raw GPS measurements.

ALTER TABLE hotspot_measurements
  ADD COLUMN IF NOT EXISTS place_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT NULL;

