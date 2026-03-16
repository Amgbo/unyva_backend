-- Found Items Table - Lost and Found feature for campus
CREATE TABLE IF NOT EXISTS found_items (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    -- Category of item
    category VARCHAR(50) NOT NULL,
    -- Where the item was found (free-text for areas like Library, Sports Center)
    location_description VARCHAR(255),
    -- University hall reference
    hall_id INTEGER REFERENCES university_halls(id) ON DELETE SET NULL,
    -- Room number where item was found
    room_number VARCHAR(20),
    -- How to contact: in_app (private), WhatsApp, Call, Email
    contact_method VARCHAR(20) NOT NULL DEFAULT 'in_app',
    -- Contact info (phone, email, or WhatsApp) - optional for privacy
    contact_info VARCHAR(100),
    -- Status: active (not claimed), claimed (owner contacted), resolved (item returned)
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    -- Images (stored as JSON array of URLs, max 3)
    images JSONB DEFAULT '[]'::jsonb,
    -- When the item was found
    item_date DATE,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Check constraints
    CONSTRAINT found_items_category_check CHECK (category IN ('Electronics', 'Books', 'Wallet/Purse', 'ID/Cards', 'Clothing', 'Keys', 'Sports Equipment', 'Other')),
    CONSTRAINT found_items_contact_method_check CHECK (contact_method IN ('in_app', 'WhatsApp', 'Call', 'Email')),
    CONSTRAINT found_items_status_check CHECK (status IN ('active', 'claimed', 'resolved'))
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_found_items_status ON found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_category ON found_items(category);
CREATE INDEX IF NOT EXISTS idx_found_items_hall_id ON found_items(hall_id);
CREATE INDEX IF NOT EXISTS idx_found_items_student_id ON found_items(student_id);
CREATE INDEX IF NOT EXISTS idx_found_items_created_at ON found_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_found_items_item_date ON found_items(item_date DESC);
