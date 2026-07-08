-- Migration: Add service views tracking table for comprehensive user behavior tracking
-- This migration adds a table to track service views, complementing the existing product_views table

-- Table to track service views and time spent
CREATE TABLE IF NOT EXISTS service_views (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    view_duration_seconds INTEGER DEFAULT 0, -- Time spent viewing the service
    viewed_at TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(255), -- To group views in the same browsing session
    device_info JSONB, -- Store device/browser info for analytics
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_service_views_student_id ON service_views(student_id);
CREATE INDEX idx_service_views_service_id ON service_views(service_id);
CREATE INDEX idx_service_views_viewed_at ON service_views(viewed_at);
CREATE INDEX idx_service_views_session_id ON service_views(session_id);

-- Add constraints
ALTER TABLE service_views ADD CONSTRAINT check_service_view_duration_positive CHECK (view_duration_seconds >= 0);
