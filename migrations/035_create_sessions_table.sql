CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL UNIQUE
                    REFERENCES bookings(id) ON DELETE CASCADE,
  session_pin     VARCHAR(6),
  started_by      VARCHAR(50) REFERENCES students(student_id),
  confirmed_by    VARCHAR(50) REFERENCES students(student_id),
  ended_by        VARCHAR(50) REFERENCES students(student_id),
  started_at      TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','active','completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_booking ON sessions(booking_id);
CREATE INDEX idx_sessions_status  ON sessions(status);

