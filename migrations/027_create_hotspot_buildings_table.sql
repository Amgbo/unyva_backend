-- Hotspot Feature - Buildings Table
-- Stores campus buildings for network intelligence system

CREATE TABLE IF NOT EXISTS hotspot_buildings (
    id SERIAL PRIMARY KEY,
    campus_id INTEGER NOT NULL REFERENCES hotspot_campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    polygon_geometry GEOMETRY(POLYGON, 4326),
    address TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campus_id, code)
);

-- Index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_hotspot_buildings_polygon ON hotspot_buildings USING GIST(polygon_geometry);

-- Index for campus lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_buildings_campus_id ON hotspot_buildings(campus_id);

-- Index for active buildings
CREATE INDEX IF NOT EXISTS idx_hotspot_buildings_active ON hotspot_buildings(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hotspot_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_buildings_updated_at_trigger
    BEFORE UPDATE ON hotspot_buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_buildings_updated_at();

-- Insert sample buildings for University of Ghana
INSERT INTO hotspot_buildings (campus_id, name, code, is_active) 
SELECT id, 'Balme Library', 'LIB', true 
FROM hotspot_campuses WHERE code = 'UG'
ON CONFLICT (campus_id, code) DO NOTHING;

INSERT INTO hotspot_buildings (campus_id, name, code, is_active) 
SELECT id, 'Student Centre', 'SC', true 
FROM hotspot_campuses WHERE code = 'UG'
ON CONFLICT (campus_id, code) DO NOTHING;

INSERT INTO hotspot_buildings (campus_id, name, code, is_active) 
SELECT id, 'Commonwealth Hall', 'CH', true 
FROM hotspot_campuses WHERE code = 'UG'
ON CONFLICT (campus_id, code) DO NOTHING;

INSERT INTO hotspot_buildings (campus_id, name, code, is_active) 
SELECT id, 'Evans Farquhar Block', 'EFB', true 
FROM hotspot_campuses WHERE code = 'UG'
ON CONFLICT (campus_id, code) DO NOTHING;

DELETE FROM hotspot_buildings
WHERE name IN (
    'Balme Library',
    'Student Centre',
    'Commonwealth Hall',
    'Evans Farquhar Block'
);