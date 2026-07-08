-- Hotspot Feature - Floors and Rooms Tables
-- Stores building floors and rooms for detailed network intelligence

-- Floors Table
CREATE TABLE IF NOT EXISTS hotspot_floors (
    id SERIAL PRIMARY KEY,
    building_id INTEGER NOT NULL REFERENCES hotspot_buildings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, floor_number)
);

-- Index for building lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_floors_building_id ON hotspot_floors(building_id);

-- Index for active floors
CREATE INDEX IF NOT EXISTS idx_hotspot_floors_active ON hotspot_floors(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hotspot_floors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_floors_updated_at_trigger
    BEFORE UPDATE ON hotspot_floors
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_floors_updated_at();

-- Rooms Table
CREATE TABLE IF NOT EXISTS hotspot_rooms (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER NOT NULL REFERENCES hotspot_floors(id) ON DELETE CASCADE,
    room_code VARCHAR(50) NOT NULL,
    room_name VARCHAR(255),
    geometry GEOMETRY(POLYGON, 4326),
    capacity INTEGER,
    room_type VARCHAR(50) DEFAULT 'general' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(floor_id, room_code)
);

-- Index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_hotspot_rooms_geometry ON hotspot_rooms USING GIST(geometry);

-- Index for floor lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_rooms_floor_id ON hotspot_rooms(floor_id);

-- Index for active rooms
CREATE INDEX IF NOT EXISTS idx_hotspot_rooms_active ON hotspot_rooms(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hotspot_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_rooms_updated_at_trigger
    BEFORE UPDATE ON hotspot_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_rooms_updated_at();

-- Insert sample floors for sample buildings
INSERT INTO hotspot_floors (building_id, floor_number, name) 
SELECT b.id, 0, 'Ground Floor'
FROM hotspot_buildings b
JOIN hotspot_campuses c ON b.campus_id = c.id
WHERE c.code = 'UG' AND b.code IN ('LIB', 'SC', 'EFB')
ON CONFLICT (building_id, floor_number) DO NOTHING;

INSERT INTO hotspot_floors (building_id, floor_number, name) 
SELECT b.id, 1, 'First Floor'
FROM hotspot_buildings b
JOIN hotspot_campuses c ON b.campus_id = c.id
WHERE c.code = 'UG' AND b.code IN ('LIB', 'SC', 'EFB')
ON CONFLICT (building_id, floor_number) DO NOTHING;

INSERT INTO hotspot_floors (building_id, floor_number, name) 
SELECT b.id, 2, 'Second Floor'
FROM hotspot_buildings b
JOIN hotspot_campuses c ON b.campus_id = c.id
WHERE c.code = 'UG' AND b.code = 'LIB'
ON CONFLICT (building_id, floor_number) DO NOTHING;

-- Insert sample rooms for library
INSERT INTO hotspot_rooms (floor_id, room_code, room_name, room_type)
SELECT f.id, 'READ-01', 'Reading Room 1', 'study'
FROM hotspot_floors f
JOIN hotspot_buildings b ON f.building_id = b.id
JOIN hotspot_campuses c ON b.campus_id = c.id
WHERE c.code = 'UG' AND b.code = 'LIB' AND f.floor_number = 0
ON CONFLICT (floor_id, room_code) DO NOTHING;

INSERT INTO hotspot_rooms (floor_id, room_code, room_name, room_type)
SELECT f.id, 'REF-01', 'Reference Section', 'reference'
FROM hotspot_floors f
JOIN hotspot_buildings b ON f.building_id = b.id
JOIN hotspot_campuses c ON b.campus_id = c.id
WHERE c.code = 'UG' AND b.code = 'LIB' AND f.floor_number = 1
ON CONFLICT (floor_id, room_code) DO NOTHING;

INSERT INTO hotspot_rooms (floor_id, room_code, room_name, room_type)
SELECT f.id, 'COMP-01', 'Computer Lab', 'lab'
FROM hotspot_floors f
JOIN hotspot_buildings b ON f.building_id = b.id
JOIN hotspot_campuses c ON b.campus_id = c.id
WHERE c.code = 'UG' AND b.code = 'LIB' AND f.floor_number = 2
ON CONFLICT (floor_id, room_code) DO NOTHING;

DELETE FROM hotspot_rooms
WHERE room_code IN ('READ-01', 'REF-01', 'COMP-01');

DELETE FROM hotspot_floors f
USING hotspot_buildings b, hotspot_campuses c
WHERE f.building_id = b.id
  AND b.campus_id = c.id
  AND c.code = 'UG'
  AND (
        (b.code IN ('LIB', 'SC', 'EFB') AND f.floor_number IN (0, 1))
        OR
        (b.code = 'LIB' AND f.floor_number = 2)
      );

	  TRUNCATE TABLE hotspot_rooms RESTART IDENTITY CASCADE;
TRUNCATE TABLE hotspot_floors RESTART IDENTITY CASCADE;
TRUNCATE TABLE hotspot_buildings RESTART IDENTITY CASCADE;