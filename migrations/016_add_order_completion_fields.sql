-- Add completion confirmation fields to orders table
ALTER TABLE orders
ADD COLUMN buyer_confirmed_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN seller_confirmed_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN orders.buyer_confirmed_complete IS 'Whether the buyer has confirmed the order is complete';
COMMENT ON COLUMN orders.seller_confirmed_complete IS 'Whether the seller has confirmed the order is complete';
COMMENT ON COLUMN orders.completed_at IS 'Timestamp when both parties confirmed completion';
