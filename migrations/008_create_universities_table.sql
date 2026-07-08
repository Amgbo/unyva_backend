-- Migration: Create universities table for multi-campus support
-- Date: 2024
-- Description: Add universities table with email domains for 13 Ghanaian universities

-- Create universities table
CREATE TABLE IF NOT EXISTS universities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(50),
    email_domain VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add university_id foreign key to students table (optional)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_university_id ON students(university_id);
CREATE INDEX IF NOT EXISTS idx_universities_email_domain ON universities(email_domain);

-- Insert the 13 Ghanaian universities
INSERT INTO universities (name, short_name, email_domain) VALUES
('University of Ghana', 'UG', 'st.ug.edu.gh'),
('Kwame Nkrumah University of Science and Technology', 'KNUST', 'knust.edu.gh'),
('University of Cape Coast', 'UCC', 'ucc.edu.gh'),
('University of Education, Winneba', 'UEW', 'uew.edu.gh'),
('University for Development Studies', 'UDS', 'uds.edu.gh'),
('University of Mines and Technology', 'UMaT', 'umat.edu.gh'),
('University of Energy and Natural Resources', 'UENR', 'uenr.edu.gh'),
('University of Professional Studies', 'UPSA', 'upsamail.edu.gh'),
('Ghana Institute of Management and Public Administration', 'GIMPA', 'gimpa.edu.gh'),
('University of Health and Allied Sciences', 'UHAS', 'uhas.edu.gh'),
('Ghana Institute of Journalism', 'GIJ', 'gij.edu.gh'),
('Ghana Communication Technology University', 'GTUC', 'gtuc.edu.gh'),
('Wisconsin International University College', 'WIUC', 'wiuc-ghana.edu.gh')
ON CONFLICT (email_domain) DO NOTHING;

-- Update existing students to link to universities based on their university field
UPDATE students
SET university_id = universities.id
FROM universities
WHERE LOWER(students.university) = LOWER(universities.name)
AND students.university_id IS NULL;

-- Add comment
COMMENT ON TABLE universities IS 'Stores supported universities with their email domains for multi-campus support';
COMMENT ON COLUMN students.university_id IS 'Foreign key to universities table for structured university data';
