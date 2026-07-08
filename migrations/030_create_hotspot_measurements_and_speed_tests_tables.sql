-- Hotspot Feature - Measurements and Speed Tests Tables
-- Core tables for storing network signal measurements and speed test results

-- Measurements Table (Immutable - append only)
CREATE TABLE IF NOT EXISTS hotspot_measurements (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    carrier_id INTEGER NOT NULL REFERENCES hotspot_carriers(id) ON DELETE CASCADE,
    device_profile_id INTEGER NOT NULL REFERENCES hotspot_device_profiles(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES hotspot_rooms(id) ON DELETE SET NULL,
    building_id INTEGER REFERENCES hotspot_buildings(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    signal_strength INTEGER NOT NULL, -- dBm value (-120 to -50)
    signal_quality INTEGER NOT NULL, -- 0-100 percentage
    network_type VARCHAR(10) NOT NULL, -- 2G, 3G, 4G, 5G, LTE
    measurement_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accuracy DECIMAL(5, 2), -- GPS accuracy in meters
    upload_status VARCHAR(20) DEFAULT 'uploaded' NOT NULL, -- pending, uploaded, failed
    idempotency_key VARCHAR(100) UNIQUE, -- For preventing duplicate submissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Check constraints
    CONSTRAINT hotspot_measurements_signal_strength_check 
        CHECK (signal_strength >= -120 AND signal_strength <= -50),
    CONSTRAINT hotspot_measurements_signal_quality_check 
        CHECK (signal_quality >= 0 AND signal_quality <= 100),
    CONSTRAINT hotspot_measurements_network_type_check 
        CHECK (network_type IN ('2G', '3G', '4G', '5G', 'LTE'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_user_id ON hotspot_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_carrier_id ON hotspot_measurements(carrier_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_building_id ON hotspot_measurements(building_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_room_id ON hotspot_measurements(room_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_timestamp ON hotspot_measurements(measurement_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_upload_status ON hotspot_measurements(upload_status);
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_location ON hotspot_measurements(latitude, longitude);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_hotspot_measurements_carrier_building 
    ON hotspot_measurements(carrier_id, building_id) WHERE upload_status = 'uploaded';

-- Speed Tests Table
CREATE TABLE IF NOT EXISTS hotspot_speed_tests (
    id SERIAL PRIMARY KEY,
    measurement_id INTEGER NOT NULL REFERENCES hotspot_measurements(id) ON DELETE CASCADE,
    download_speed DECIMAL(10, 2) NOT NULL, -- Mbps
    upload_speed DECIMAL(10, 2) NOT NULL, -- Mbps
    latency INTEGER NOT NULL, -- ms
    jitter INTEGER, -- ms (optional)
    packet_loss DECIMAL(5, 2) DEFAULT 0.00, -- percentage
    server_identifier VARCHAR(100),
    tested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Check constraints
    CONSTRAINT hotspot_speed_tests_download_speed_check 
        CHECK (download_speed >= 0),
    CONSTRAINT hotspot_speed_tests_upload_speed_check 
        CHECK (upload_speed >= 0),
    CONSTRAINT hotspot_speed_tests_latency_check 
        CHECK (latency >= 0)
);

-- Index for measurement lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_speed_tests_measurement_id ON hotspot_speed_tests(measurement_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_speed_tests_tested_at ON hotspot_speed_tests(tested_at DESC);