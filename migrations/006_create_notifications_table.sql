-- Migration: Create notifications table
-- Description: Creates the notifications table to store all types of notifications for users

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'message', 'order', 'payment', 'system', 'admin'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data for the notification (e.g., order_id, product_id)
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    delivery_methods TEXT[] DEFAULT ARRAY['push'], -- Array of delivery methods: 'push', 'email', 'in_app', 'sms'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Comments
COMMENT ON TABLE notifications IS 'Stores all notifications for users including push, email, in-app, and SMS';
COMMENT ON COLUMN notifications.user_id IS 'Reference to the student/user receiving the notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification (message, order, payment, system, admin, etc.)';
COMMENT ON COLUMN notifications.title IS 'Short title for the notification';
COMMENT ON COLUMN notifications.message IS 'Full message content';
COMMENT ON COLUMN notifications.data IS 'JSON data containing additional context (order_id, product_id, etc.)';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN notifications.status IS 'Current status: pending, sent, delivered, read, failed';
COMMENT ON COLUMN notifications.delivery_methods IS 'Array of delivery methods to use';
COMMENT ON COLUMN notifications.scheduled_at IS 'When to send the notification (for scheduled notifications)';
COMMENT ON COLUMN notifications.sent_at IS 'Timestamp when notification was sent';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when user read the notification';
COMMENT ON COLUMN notifications.retry_count IS 'Number of retry attempts';
COMMENT ON COLUMN notifications.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN notifications.error_message IS 'Error message if delivery failed';
