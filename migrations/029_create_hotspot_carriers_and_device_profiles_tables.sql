-- Hotspot Feature - Carriers and Device Profiles Tables
-- Stores mobile network carriers and anonymous device capability information

-- Carriers Table
CREATE TABLE IF NOT EXISTS hotspot_carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    country_code VARCHAR(10) NOT NULL DEFAULT 'GH',
    network_code VARCHAR(10) UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    display_color VARCHAR(7) DEFAULT '#3B82F6' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for active carriers
CREATE INDEX IF NOT EXISTS idx_hotspot_carriers_active ON hotspot_carriers(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hotspot_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotspot_carriers_updated_at_trigger
    BEFORE UPDATE ON hotspot_carriers
    FOR EACH ROW
    EXECUTE FUNCTION update_hotspot_carriers_updated_at();

-- Device Profiles Table (Anonymous)
CREATE TABLE IF NOT EXISTS hotspot_device_profiles (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    os_version VARCHAR(20),
    app_version VARCHAR(20),
    capabilities JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, manufacturer, model, os_version, app_version)
);

-- Index for platform lookup
CREATE INDEX IF NOT EXISTS idx_hotspot_device_profiles_platform ON hotspot_device_profiles(platform);

-- Insert Ghana mobile carriers
INSERT INTO hotspot_carriers (name, country_code, network_code, display_color, is_active) 
VALUES 
    ('MTN', 'GH', '62001', '#FFCC00', true),
    ('Vodafone', 'GH', '62002', '#E60000', true),
    ('AirtelTigo', 'GH', '62003', '#0066CC', true),
    ('Glo', 'GH', '62006', '#009900', true),
    ('Expresso', 'GH', '62004', '#FF6600', false)
ON CONFLICT (name) DO NOTHING;