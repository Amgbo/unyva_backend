CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freshman_id     VARCHAR(50) NOT NULL
                    REFERENCES students(student_id) ON DELETE CASCADE,
  guide_id        UUID NOT NULL
                    REFERENCES guides(id) ON DELETE CASCADE,
  help_category   VARCHAR(100) NOT NULL,
  preferred_date  DATE NOT NULL,
  preferred_time  TIME NOT NULL,
  message         TEXT,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN
                      ('pending','accepted','declined',
                       'completed','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_freshman ON bookings(freshman_id);
CREATE INDEX idx_bookings_guide    ON bookings(guide_id);
CREATE INDEX idx_bookings_status   ON bookings(status);

