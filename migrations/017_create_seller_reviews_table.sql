-- Create seller_reviews table for seller review system

CREATE TABLE seller_reviews (
    id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    seller_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT seller_reviews_unique_deal_reviewer UNIQUE (deal_id, reviewer_id),
    CONSTRAINT seller_reviews_no_self_review CHECK (reviewer_id != seller_id)
);

-- Indexes for performance
CREATE INDEX idx_seller_reviews_seller_id ON seller_reviews(seller_id);
CREATE INDEX idx_seller_reviews_reviewer_id ON seller_reviews(reviewer_id);
CREATE INDEX idx_seller_reviews_deal_id ON seller_reviews(deal_id);
CREATE INDEX idx_seller_reviews_created_at ON seller_reviews(created_at);
CREATE INDEX idx_seller_reviews_rating ON seller_reviews(rating);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seller_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_seller_reviews_updated_at
    BEFORE UPDATE ON seller_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_seller_reviews_updated_at();
