-- Migration: Create product_messages table for Phase One messaging system
-- This table stores buyer-seller messages anchored to specific products

CREATE TABLE IF NOT EXISTS product_messages (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sender_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    receiver_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_product_messages_product_id ON product_messages(product_id);
CREATE INDEX idx_product_messages_sender_id ON product_messages(sender_id);
CREATE INDEX idx_product_messages_receiver_id ON product_messages(receiver_id);
CREATE INDEX idx_product_messages_created_at ON product_messages(created_at);
CREATE INDEX idx_product_messages_is_read ON product_messages(is_read);

-- Add constraint to prevent empty messages
ALTER TABLE product_messages ADD CONSTRAINT check_message_not_empty CHECK (length(trim(message)) > 0);
