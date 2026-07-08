-- Migration 041: Add campus place lookup table and coverage summary human-readable columns
-- Safe to run multiple times.

BEGIN;

-- 1) Ensure hotspot_places exists for offline campus-first resolution.
CREATE TABLE IF NOT EXISTS hotspot_places (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Helpful index for coarse coordinate filtering.
CREATE INDEX IF NOT EXISTS idx_hotspot_places_lat_lng
    ON hotspot_places(latitude, longitude);

-- 2) Ensure hotspot_coverage_summary stores resolved human-readable labels.
ALTER TABLE hotspot_coverage_summary
    ADD COLUMN IF NOT EXISTS place_name TEXT,
    ADD COLUMN IF NOT EXISTS formatted_address TEXT;

COMMIT;
