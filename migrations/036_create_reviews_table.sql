CREATE TABLE reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL UNIQUE
                 REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id  VARCHAR(50) NOT NULL
                 REFERENCES students(student_id),
  guide_id     UUID NOT NULL
                 REFERENCES guides(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_guide ON reviews(guide_id);

