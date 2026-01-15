-- Create throne-related tables for throne system

-- Throne types table
CREATE TABLE throne_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    points_required INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thrones table for current throne holders
CREATE TABLE thrones (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    throne_type_id INTEGER NOT NULL REFERENCES throne_types(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT thrones_unique_student_week UNIQUE (student_id, week_start)
);

-- Throne history table for past throne holders
CREATE TABLE throne_history (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    throne_type_id INTEGER NOT NULL REFERENCES throne_types(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT throne_history_unique_student_week UNIQUE (student_id, week_start)
);

-- Indexes for performance
CREATE INDEX idx_thrones_student_id ON thrones(student_id);
CREATE INDEX idx_thrones_week_start ON thrones(week_start);
CREATE INDEX idx_thrones_throne_type_id ON thrones(throne_type_id);
CREATE INDEX idx_throne_history_student_id ON throne_history(student_id);
CREATE INDEX idx_throne_history_week_start ON throne_history(week_start);
CREATE INDEX idx_throne_history_throne_type_id ON throne_history(throne_type_id);

-- Function to update updated_at for thrones
CREATE OR REPLACE FUNCTION update_thrones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for thrones updated_at
CREATE TRIGGER trigger_update_thrones_updated_at
    BEFORE UPDATE ON thrones
    FOR EACH ROW
    EXECUTE FUNCTION update_thrones_updated_at();
