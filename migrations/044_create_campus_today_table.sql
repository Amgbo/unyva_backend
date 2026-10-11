-- Migration: Create the Campus Today feed table.

CREATE TABLE IF NOT EXISTS campus_today (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (
    category IN ('events', 'item13', 'deals', 'announcements', 'opportunities', 'sports')
  ),
  image_url TEXT,
  event_date DATE NOT NULL,
  event_time VARCHAR(100),
  location VARCHAR(255),
  organizer VARCHAR(255),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS campus_today_feed_idx
  ON campus_today (is_pinned DESC, is_featured DESC, event_date, created_at DESC);
