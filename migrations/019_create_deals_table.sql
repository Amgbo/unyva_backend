-- Create deals table for transaction confirmations
-- This enables seller ratings and reviews system

CREATE TABLE deals (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    seller_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT deals_unique_product_buyer UNIQUE (product_id, buyer_id),
    CONSTRAINT deals_check_completed_at CHECK (
        (buyer_confirmed = TRUE AND seller_confirmed = TRUE AND completed_at IS NOT NULL) OR
        (completed_at IS NULL)
    ),
    CONSTRAINT deals_check_seller_not_buyer CHECK (buyer_id != seller_id)
);

-- Indexes for performance
CREATE INDEX idx_deals_product_id ON deals(product_id);
CREATE INDEX idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX idx_deals_seller_id ON deals(seller_id);
CREATE INDEX idx_deals_completed_at ON deals(completed_at);
CREATE INDEX idx_deals_status ON deals(buyer_confirmed, seller_confirmed);

-- Function to automatically set completed_at when both confirm
CREATE OR REPLACE FUNCTION update_deal_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.buyer_confirmed = TRUE AND NEW.seller_confirmed = TRUE AND OLD.completed_at IS NULL THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set completed_at
CREATE TRIGGER trigger_deal_completed_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_completed_at();
