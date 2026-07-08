-- Hotspot Feature - Coverage Summary, Heatmap Tiles, and Configuration Tables
-- Supporting tables for analytics, visualization, and system configuration

-- Coverage Summary Table (Aggregated statistics - generated automatically)
CREATE TABLE IF NOT EXISTS hotspot_coverage_summary (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES hotspot_buildings(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES hotspot_rooms(id) ON DELETE CASCADE,
    carrier_id INTEGER NOT NULL REFERENCES hotspot_carriers(id) ON DELETE CASCADE,
    average_signal_strength DECIMAL(5, 2) NOT NULL, -- dBm
    average_signal_quality DECIMAL(5, 2) NOT NULL, -- 0-100
    average_download_speed DECIMAL(10, 2), -- Mbps
    average_upload_speed DECIMAL(10, 2), -- Mbps
    average_latency INTEGER, -- ms
    measurement_count INTEGER NOT NULL DEFAULT 0,
    speed_test_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, room_id, carrier_id)
);

-- Index for building/carrier lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_coverage_summary_building_carrier 
    ON hotspot_coverage_summary(building_id, carrier_id) WHERE building_id IS NOT NULL;

-- Index for room/carrier lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_coverage_summary_room_carrier 
    ON hotspot_coverage_summary(room_id, carrier_id) WHERE room_id IS NOT NULL;

-- Heatmap Tiles Table (Precomputed heatmap data for map rendering)
CREATE TABLE IF NOT EXISTS hotspot_heatmap_tiles (
    id SERIAL PRIMARY KEY,
    zoom_level INTEGER NOT NULL,
    tile_x INTEGER NOT NULL,
    tile_y INTEGER NOT NULL,
    carrier_id INTEGER NOT NULL REFERENCES hotspot_carriers(id) ON DELETE CASCADE,
    signal_score DECIMAL(5, 2) NOT NULL, -- 0-100 normalized score
    measurement_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(zoom_level, tile_x, tile_y, carrier_id)
);

-- Index for tile lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_heatmap_tiles_zoom_xy 
    ON hotspot_heatmap_tiles(zoom_level, tile_x, tile_y);

-- Index for carrier lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_heatmap_tiles_carrier 
    ON hotspot_heatmap_tiles(carrier_id);

-- Configuration Table (Runtime configuration - backend controlled)
CREATE TABLE IF NOT EXISTS hotspot_configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(20) REFERENCES students(student_id) ON DELETE SET NULL
);

-- Index for key lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_configuration_key ON hotspot_configuration(config_key);

-- Trigger to update last_updated timestamp for coverage summary
CREATE OR REPLACE FUNCTION update_hotspot_coverage_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_coverage_summary_updated_at_trigger
    BEFORE UPDATE ON hotspot_coverage_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_coverage_summary_updated_at();

-- Trigger to update updated_at timestamp for heatmap tiles
CREATE OR REPLACE FUNCTION update_hotspot_coverage_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_heatmap_tiles_updated_at_trigger
    BEFORE UPDATE ON hotspot_heatmap_tiles
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_heatmap_tiles_updated_at();

-- Insert default configuration values
INSERT INTO hotspot_configuration (config_key, config_value, description, is_public) VALUES
    ('collection_interval_minutes', '{"value": 15, "min": 5, "max": 60}', 'Background signal collection interval in minutes', true),
    ('upload_interval_minutes', '{"value": 30, "min": 10, "max": 120}', 'Interval for uploading queued measurements', true),
    ('signal_thresholds', '{
        "excellent": {"min": -70, "max": -50, "color": "#22C55E"},
        "good": {"min": -85, "max": -71, "color": "#84CC16"},
        "fair": {"min": -100, "max": -86, "color": "#F59E0B"},
        "poor": {"min": -120, "max": -101, "color": "#EF4444"}
    }', 'Signal strength thresholds and display colors', true),
    ('speed_test_timeout_seconds', '{"value": 60}', 'Maximum duration for a speed test', false),
    ('max_measurements_per_batch', '{"value": 50}', 'Maximum measurements to upload in one batch', false),
    ('retention_days', '{"value": 365}', 'Number of days to retain measurement history', false),
    ('rate_limit_measurements_per_hour', '{"value": 100}', 'Maximum measurements per user per hour', false),
    ('rate_limit_speed_tests_per_hour', '{"value": 10}', 'Maximum speed tests per user per hour', false),
    ('feature_flags', '{
        "background_collection": true,
        "speed_testing": true,
        "heatmap": true,
        "analytics": true
    }', 'Feature availability flags', true)
ON CONFLICT (config_key) DO NOTHING;