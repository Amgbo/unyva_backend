CREATE TABLE guides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          VARCHAR(50) NOT NULL UNIQUE
                        REFERENCES students(student_id) ON DELETE CASCADE,
  department          VARCHAR(150),
  college             VARCHAR(150),
  hall                VARCHAR(150),
  year                INTEGER,
  bio                 TEXT,
  areas_of_expertise  TEXT[],
  availability_status VARCHAR(20) DEFAULT 'available'
                        CHECK (availability_status IN
                          ('available','in_class','at_dorm')),
  rating              NUMERIC(3,2) DEFAULT 0.00,
  completed_sessions  INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guides_student_id   ON guides(student_id);
CREATE INDEX idx_guides_availability ON guides(availability_status);
CREATE INDEX idx_guides_department   ON guides(department);
CREATE INDEX idx_guides_rating       ON guides(rating DESC);

