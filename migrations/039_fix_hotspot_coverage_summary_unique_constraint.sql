-- Migration 039: Fix hotspot_coverage_summary unique constraint for GPS-first clusters
-- Problem: the existing UNIQUE(building_id, room_id, carrier_id) constraint treats
-- multiple NULL combinations as distinct, so every GPS-first cluster (where building_id
-- and room_id are NULL) gets its own row instead of updating the existing cluster row.
-- This causes the nearby query to return no rows until enough duplicate NULL rows are
-- inserted, and makes aggregation fail silently on conflict.
--
-- This migration drops the old constraint and recreates it with NULLS NOT DISTINCT
-- so that (NULL, NULL, carrier_id) is unique per carrier. Run this against your
-- already-initialized database.

BEGIN;

-- 1. Drop the old unique constraint (name may vary by how the table was created).
-- We try the auto-generated name first, then any custom name.
DO $$
BEGIN
    ALTER TABLE hotspot_coverage_summary
        DROP CONSTRAINT IF EXISTS hotspot_coverage_summary_building_id_room_id_carrier_id_key;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if the constraint does not exist under that name
    NULL;
END $$;

-- 2. Add the corrected unique constraint that treats NULLs as equal.
-- This is required for GPS-first mode where building_id and room_id are always NULL.
ALTER TABLE hotspot_coverage_summary
    ADD CONSTRAINT hotspot_coverage_summary_building_id_room_id_carrier_id_key
    UNIQUE NULLS NOT DISTINCT (building_id, room_id, carrier_id);

-- 3. Clean up any duplicate rows that may have accumulated before this fix.
-- Keep the row with the most recent measurement for each (building_id, room_id, carrier_id).
DELETE FROM hotspot_coverage_summary a
USING hotspot_coverage_summary b
WHERE a.id < b.id
  AND COALESCE(a.building_id, -1) = COALESCE(b.building_id, -1)
  AND COALESCE(a.room_id, -1) = COALESCE(b.room_id, -1)
  AND a.carrier_id = b.carrier_id;

COMMIT;

SELECT
    id,
    created_at,
    latitude,
    longitude,
    carrier_id,
    signal_strength,
    signal_quality,
    building_id,
    room_id,
    place_name
FROM hotspot_measurements
ORDER BY created_at DESC
LIMIT 20;

SELECT COUNT(*) FROM hotspot_measurements;
SELECT COUNT(*) FROM hotspot_coverage_summary;

SELECT MAX(created_at)
FROM hotspot_measurements;

INSERT INTO hotspot_carriers
(name, country_code, network_code, display_color, is_active)
VALUES
('MTN', 'GH', '62001', '#FFCC00', true),
('Telecel', 'GH', '62002', '#E60000', true),
('AT', 'GH', '62003', '#0066CC', true),
('Glo', 'GH', '62006', '#00AA00', true)
ON CONFLICT DO NOTHING;