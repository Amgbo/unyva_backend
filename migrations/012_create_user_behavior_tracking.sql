-- Migration: Create user behavior tracking tables for personalized recommendations
-- This migration adds tables to track user interactions for building recommendation systems

-- Table to track product views and time spent
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    view_duration_seconds INTEGER DEFAULT 0, -- Time spent viewing the product
    viewed_at TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(255), -- To group views in the same browsing session
    device_info JSONB, -- Store device/browser info for analytics
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table to track search history
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE, -- NULL for anonymous searches
    search_query TEXT NOT NULL,
    filters JSONB, -- Store applied filters (category, price range, etc.)
    result_count INTEGER DEFAULT 0, -- Number of results returned
    searched_at TIMESTAMP DEFAULT NOW(),
    session_id VARCHAR(255),
    device_info JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table to track user interactions (likes, favorites, cart additions, etc.)
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'like', 'favorite', 'cart_add', 'cart_remove', 'purchase', etc.
    metadata JSONB, -- Additional data like quantity, price at time of interaction
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, product_id, interaction_type) -- Prevent duplicate interactions
);

-- Table to track purchase history (complementing existing orders table)
CREATE TABLE IF NOT EXISTS purchase_history (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_product_views_student_id ON product_views(student_id);
CREATE INDEX idx_product_views_product_id ON product_views(product_id);
CREATE INDEX idx_product_views_viewed_at ON product_views(viewed_at);
CREATE INDEX idx_product_views_session_id ON product_views(session_id);

CREATE INDEX idx_search_history_student_id ON search_history(student_id);
CREATE INDEX idx_search_history_searched_at ON search_history(searched_at);
CREATE INDEX idx_search_history_session_id ON search_history(session_id);
CREATE INDEX idx_search_history_query_gin ON search_history USING GIN (to_tsvector('english', search_query));

CREATE INDEX idx_user_interactions_student_id ON user_interactions(student_id);
CREATE INDEX idx_user_interactions_product_id ON user_interactions(product_id);
CREATE INDEX idx_user_interactions_service_id ON user_interactions(service_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);

CREATE INDEX idx_purchase_history_student_id ON purchase_history(student_id);
CREATE INDEX idx_purchase_history_product_id ON purchase_history(product_id);
CREATE INDEX idx_purchase_history_order_id ON purchase_history(order_id);
CREATE INDEX idx_purchase_history_purchased_at ON purchase_history(purchased_at);

-- Add constraints
ALTER TABLE product_views ADD CONSTRAINT check_view_duration_positive CHECK (view_duration_seconds >= 0);
ALTER TABLE search_history ADD CONSTRAINT check_search_query_not_empty CHECK (length(trim(search_query)) > 0);
ALTER TABLE user_interactions ADD CONSTRAINT check_interaction_type_valid CHECK (interaction_type IN ('like', 'favorite', 'cart_add', 'cart_remove', 'purchase', 'share', 'report'));
ALTER TABLE purchase_history ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0);
ALTER TABLE purchase_history ADD CONSTRAINT check_price_positive CHECK (price_at_purchase > 0);

-- Add trigger to automatically populate purchase_history from orders
CREATE OR REPLACE FUNCTION populate_purchase_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if the order is confirmed/delivered
    IF NEW.status IN ('confirmed', 'delivered') THEN
        INSERT INTO purchase_history (student_id, product_id, order_id, quantity, price_at_purchase, purchased_at)
        VALUES (NEW.customer_id, NEW.product_id, NEW.id, NEW.quantity, NEW.price, NEW.created_at)
        ON CONFLICT DO NOTHING; -- Prevent duplicates
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_purchase_history
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION populate_purchase_history();
