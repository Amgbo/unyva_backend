-- ===========================================
-- NOTIFICATIONS SYSTEM SCHEMA
-- ===========================================
-- This file contains the complete schema for the notifications system
-- including table creation, constraints, indexes, and foreign keys.

-- ===========================================
-- NOTIFICATIONS TABLE
-- ===========================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'delivery', 'payment', 'announcement', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    delivery_methods TEXT[] DEFAULT ARRAY['push'],
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifications ALTER COLUMN user_id TYPE VARCHAR(20);
-- ===========================================
-- FOREIGN KEY CONSTRAINTS
-- ===========================================

-- Add foreign key constraint to students table
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_user_id
FOREIGN KEY (user_id) REFERENCES students(student_id) ON DELETE CASCADE;

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Primary index on id (automatically created with PRIMARY KEY)

-- Index for user_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Index for priority ordering
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Index for scheduled notifications
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Index for created_at ordering (for pagination)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Composite index for user notifications with status filter
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);

-- Composite index for user notifications with type filter
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);

-- Composite index for pending notifications by priority and creation time
CREATE INDEX IF NOT EXISTS idx_notifications_pending_priority ON notifications(priority DESC, created_at ASC) WHERE status = 'pending';

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- ===========================================
-- DATA VALIDATION CONSTRAINTS
-- ===========================================

-- Ensure retry_count doesn't exceed max_retries
ALTER TABLE notifications
ADD CONSTRAINT chk_retry_count_max
CHECK (retry_count <= max_retries);

-- Ensure timestamps are logical (read_at >= delivered_at >= sent_at >= created_at)
ALTER TABLE notifications
ADD CONSTRAINT chk_notification_timestamps
CHECK (
    (read_at IS NULL OR delivered_at IS NULL OR read_at >= delivered_at) AND
    (delivered_at IS NULL OR sent_at IS NULL OR delivered_at >= sent_at) AND
    (sent_at IS NULL OR sent_at >= created_at)
);

-- ===========================================
-- USEFUL VIEWS
-- ===========================================

-- View for unread notifications count per user
CREATE OR REPLACE VIEW unread_notifications_count AS
SELECT
    user_id,
    COUNT(*) as unread_count
FROM notifications
WHERE status IN ('sent', 'delivered') AND read_at IS NULL
GROUP BY user_id;

-- View for recent notifications (last 30 days)
CREATE OR REPLACE VIEW recent_notifications AS
SELECT * FROM notifications
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY created_at DESC;

-- ===========================================
-- USEFUL FUNCTIONS
-- ===========================================

-- Function to get notifications for a user with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id INTEGER,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    user_id INTEGER,
    type VARCHAR,
    title VARCHAR,
    message TEXT,
    data JSONB,
    priority VARCHAR,
    status VARCHAR,
    delivery_methods TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.priority,
        n.status,
        n.delivery_methods,
        n.created_at,
        n.read_at
    FROM notifications n
    WHERE n.user_id = p_user_id
        AND (p_status IS NULL OR n.status = p_status)
        AND (p_type IS NULL OR n.type = p_type)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET
        status = 'read',
        read_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_notification_id AND read_at IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending notifications for processing
CREATE OR REPLACE FUNCTION get_pending_notifications(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id INTEGER,
    user_id INTEGER,
    type VARCHAR,
    title VARCHAR,
    message TEXT,
    data JSONB,
    priority VARCHAR,
    delivery_methods TEXT[],
    retry_count INTEGER,
    max_retries INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.priority,
        n.delivery_methods,
        n.retry_count,
        n.max_retries
    FROM notifications n
    WHERE n.status = 'pending'
        AND (n.scheduled_at IS NULL OR n.scheduled_at <= CURRENT_TIMESTAMP)
    ORDER BY
        CASE n.priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
        END,
        n.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- PERMISSIONS
-- ===========================================

-- Grant necessary permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE ON notifications TO your_app_user;
-- GRANT USAGE ON SEQUENCE notifications_id_seq TO your_app_user;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE notifications IS 'Stores all user notifications including push notifications, in-app messages, and system alerts';
COMMENT ON COLUMN notifications.id IS 'Unique identifier for each notification';
COMMENT ON COLUMN notifications.user_id IS 'Reference to the student/user who receives this notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification: order, delivery, payment, announcement, system';
COMMENT ON COLUMN notifications.title IS 'Short title of the notification';
COMMENT ON COLUMN notifications.message IS 'Full message content of the notification';
COMMENT ON COLUMN notifications.data IS 'Additional JSON data related to the notification (e.g., order_id, delivery_id)';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN notifications.status IS 'Current status: pending, sent, delivered, read, failed';
COMMENT ON COLUMN notifications.delivery_methods IS 'Array of delivery methods: push, email, sms, in-app';
COMMENT ON COLUMN notifications.scheduled_at IS 'When the notification should be sent (for scheduled notifications)';
COMMENT ON COLUMN notifications.sent_at IS 'Timestamp when notification was sent';
COMMENT ON COLUMN notifications.delivered_at IS 'Timestamp when notification was delivered';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was read by user';
COMMENT ON COLUMN notifications.retry_count IS 'Number of retry attempts for failed deliveries';
COMMENT ON COLUMN notifications.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN notifications.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN notifications.created_at IS 'Timestamp when notification was created';
COMMENT ON COLUMN notifications.updated_at IS 'Timestamp when notification was last updated';

-- ===========================================
-- SAMPLE DATA (Optional - for testing)
-- ===========================================

-- Insert sample notification (uncomment to use)

INSERT INTO notifications (
    user_id, type, title, message, data, priority, delivery_methods
) VALUES (
    '00000000', -- This matches your existing student
    'system',
    'Welcome to Unyva!',
    'Thank you for joining our platform. Start exploring products and services!',
    '{"action": "welcome"}',
    'medium',
    ARRAY['push', 'in-app']
);
