-- Hotspot Feature - Add geolocation + confidence/reliability score columns to coverage summary
--
-- WHY THIS MIGRATION EXISTS
-- --------------------------
-- The recommendation engine must recommend the geographically NEAREST real
-- measurements to the user, not whatever building the (separate, polygon-based)
-- building-detection heuristic guessed. Building polygons are not populated in
-- this dataset, so building-detection silently falls back to campus-center
-- distance for every building, which made every "nearest building" lookup
-- resolve to the same (alphabetically-first) building — this is the root cause
-- of the "always recommends Balme Library" bug.
--
-- Raw measurements always carry a real, accurate GPS latitude/longitude
-- (captured at the moment of measurement), regardless of whether the
-- measurement's building_id/room_id tagging was correct. By persisting the
-- centroid of each coverage summary's underlying measurements, the
-- recommendation engine can rank/query purely by real GPS distance and
-- completely sidestep the building-detection bug.

ALTER TABLE hotspot_coverage_summary
    ADD COLUMN IF NOT EXISTS average_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS average_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS last_measurement_at TIMESTAMP;

-- Index to speed up "nearby" lookups (a full haversine scan is fine at current
-- scale, but this keeps rows with no location out of the scan cheaply).
CREATE INDEX IF NOT EXISTS idx_hotspot_coverage_summary_location
    ON hotspot_coverage_summary(average_latitude, average_longitude)
    WHERE average_latitude IS NOT NULL AND average_longitude IS NOT NULL;
