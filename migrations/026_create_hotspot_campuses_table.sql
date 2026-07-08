-- Hotspot Feature - Campus Table
-- Stores supported university campuses for network intelligence system

CREATE TABLE IF NOT EXISTS hotspot_campuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL DEFAULT 'Ghana',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    boundary_geometry GEOMETRY(POLYGON, 4326),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_hotspot_campuses_boundary ON hotspot_campuses USING GIST(boundary_geometry);

-- Index for active campuses
CREATE INDEX IF NOT EXISTS idx_hotspot_campuses_active ON hotspot_campuses(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hotspot_campuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_campuses_updated_at_trigger
    BEFORE UPDATE ON hotspot_campuses
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_campuses_updated_at();

-- Insert default University of Ghana campus
INSERT INTO hotspot_campuses (name, code, country, latitude, longitude, is_active) 
VALUES ('University of Ghana', 'UG', 'Ghana', 5.6515, -0.1870, true)
ON CONFLICT (code) DO NOTHING;