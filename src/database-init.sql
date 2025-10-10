-- Database initialization script to fix missing university_halls table
-- This script creates the university_halls table and inserts University of Ghana hall data

-- Create university_halls table if it doesn't exist
CREATE TABLE IF NOT EXISTS university_halls (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL UNIQUE,
    short_name VARCHAR(20),
    description TEXT,
    location_zone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert University of Ghana halls data
INSERT INTO university_halls (full_name, short_name, location_zone) VALUES
('Commonwealth Hall', 'Commey', 'Main Campus'),
('Legon Hall', 'Legon', 'Main Campus'),
('Volta Hall', 'Volta', 'Main Campus'),
('Akuafo Hall', 'Akuafo', 'Main Campus'),
('Mensah Sarbah Hall', 'Sarbah', 'Main Campus'),
('Jean Nelson Aka Hall', 'JNA', 'Main Campus'),
('Elizabeth Sey Hall', 'E-Sey', 'Main Campus'),
('Hilla Limann Hall', 'Limann', 'Main Campus'),
('Alexander Kwapong Hall', 'Kwapong', 'Main Campus'),
('James Topp Nelson Yankah Hall', 'JTNY', 'Main Campus'),
('Bani Hall', 'Bani', 'Main Campus'),
('Africa Hall', 'Africa', 'Main Campus'),
('International Students Hostel', 'ISH', 'Main Campus'),
('Valco Trust Hostel', 'Valco', 'Main Campus'),
('Off-Campus', 'Off-Campus', 'Off-Campus')
ON CONFLICT (full_name) DO NOTHING;

-- Verify the table was created and has data
SELECT 'university_halls table created successfully with ' || COUNT(*) || ' records' as status
FROM university_halls;
