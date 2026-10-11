-- Migration 045: Hotspot Feature Fix Plan Enhancements
-- Adds missing columns to hotspot_places, creates performance indexes,
-- and ensures carrier & measurement timestamps are efficiently indexed.
-- SAFE TO RUN MULTIPLE TIMES.

BEGIN;

-- 1. Enhance hotspot_places table with type, building_id, and is_active columns
ALTER TABLE hotspot_places
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'campus_location',
    ADD COLUMN IF NOT EXISTS building_id INTEGER REFERENCES hotspot_buildings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index for active campus places lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_places_active
    ON hotspot_places(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_hotspot_places_lat_lng_active
    ON hotspot_places(latitude, longitude) WHERE is_active = true;

-- 2. Performance indexes for hotspot_measurements
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_carrier_ts
    ON hotspot_measurements(carrier_id, measurement_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_carrier_lat_lng
    ON hotspot_measurements(carrier_id, latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_accuracy
    ON hotspot_measurements(accuracy);

-- 3. Performance indexes for hotspot_coverage_summary
CREATE INDEX IF NOT EXISTS idx_hotspot_coverage_summary_carrier_lat_lng
    ON hotspot_coverage_summary(carrier_id, average_latitude, average_longitude);

CREATE INDEX IF NOT EXISTS idx_hotspot_coverage_summary_carrier_last_ts
    ON hotspot_coverage_summary(carrier_id, last_measurement_at DESC);

COMMIT;
