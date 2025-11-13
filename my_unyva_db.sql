--new database

-- Students table

CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(20) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  gender VARCHAR(10),
  hall_of_residence TEXT,
  date_of_birth DATE,
  profile_picture TEXT,
  id_card TEXT,
  password TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  role VARCHAR(20) DEFAULT 'buyer_seller',
  delivery_code VARCHAR(20) DEFAULT NULL,
  is_delivery_approved BOOLEAN DEFAULT false,
  university VARCHAR(255) DEFAULT NULL,
  program VARCHAR(255) DEFAULT NULL,
  graduation_year INTEGER DEFAULT NULL,
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_ratings INTEGER DEFAULT 0,
  room_number VARCHAR(20),
  is_active_seller BOOLEAN DEFAULT FALSE,
  is_active_service_provider BOOLEAN DEFAULT FALSE,
  seller_rating DECIMAL(3,2) DEFAULT 5.0,
  seller_review_count INTEGER DEFAULT 0,
  service_provider_rating DECIMAL(3,2) DEFAULT 5.0,
  service_review_count INTEGER DEFAULT 0,
  delivery_rating DECIMAL(3,2) DEFAULT 5.0,
  delivery_review_count INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  profile_completion_score INTEGER DEFAULT 0,
  preferred_contact_method VARCHAR(20) DEFAULT 'in_app',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Add registration_complete column to students table
-- This allows incomplete registrations to be overwritten

ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT FALSE;

-- Update existing records to be considered complete if they have password set
UPDATE students SET registration_complete = TRUE WHERE password IS NOT NULL AND password != '';

-- Add comment to the column
COMMENT ON COLUMN students.registration_complete IS 'Indicates if student registration is fully complete (Step 1 + Step 2)';




select * from students;


CREATE TABLE IF NOT EXISTS university_halls (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL UNIQUE,
    short_name VARCHAR(20),
    description TEXT,
    location_zone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Insert University of Ghana halls data
INSERT INTO university_halls (full_name, short_name, location_zone) VALUES
('Commonwealth Hall', 'Commey', 'Main Campus'),
('Legon Hall', 'Legon', 'Main Campus'),
('Volta Hall', 'Volta', 'Main Campus'),
('Akuafo Hall', 'Akuafo', 'Main Campus'),
('Mensah Sarbah Hall', 'Sarbah', 'Main Campus'),
('Jean Nelson Aka Hall', 'JNA', 'Main Campus'),
('Elizabeth Sey Hall', 'E-Sey', 'Main Campus'),
('Hilla Limann Hall', 'Limann', 'Main Campus'),
('Alexander Kwapong Hall', 'Kwapong', 'Main Campus'),
('James Topp Nelson Yankah Hall', 'JTNY', 'Main Campus'),
('Bani Hall', 'Bani', 'Main Campus'),
('Africa Hall', 'Africa', 'Main Campus'),
('International Students Hostel', 'ISH', 'Main Campus'),
('Valco Trust Hostel', 'Valco', 'Main Campus'),
('Off-Campus', 'Off-Campus', 'Off-Campus')
ON CONFLICT (full_name) DO NOTHING;





-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0 AND price <= 10000),
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('Books', 'Electronics', 'Fashion', 'Hostel Items', 'Food', 'Other')
    ),
    condition VARCHAR(20) NOT NULL DEFAULT 'Good' CHECK (
        condition IN ('New', 'Used', 'Like New', 'Good', 'Fair')
    ),
    contact_method VARCHAR(20) NOT NULL CHECK (
        contact_method IN ('WhatsApp', 'Call', 'SMS', 'in_app')
    ),
    hall_id INTEGER REFERENCES university_halls(id) ON DELETE SET NULL,
    room_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN ('draft', 'available', 'reserved', 'sold', 'archived')
    ),
    is_approved BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    price_negotiable BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_bumped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);




-- PRODUCT REVIEWS MODULE

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT NOT NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, student_id)
);




-- ============================
-- PRODUCT REVIEWS NESTED REPLIES MIGRATION

-- Add parent_id column for nested replies
ALTER TABLE product_reviews ADD COLUMN parent_id INTEGER REFERENCES product_reviews(id) ON DELETE CASCADE;

-- Make rating nullable for replies (only required for top-level reviews)
ALTER TABLE product_reviews ALTER COLUMN rating DROP NOT NULL;

-- Remove UNIQUE constraint on (product_id, student_id) since one student may write multiple replies
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_student_id_key;

-- Add updated_at column if it doesn't exist
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update trigger to handle updated_at
CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_reviews_updated_at();

-- Add indexes for better performance with nested queries
CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_id ON product_reviews(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_product_reviews_updated_at ON product_reviews(updated_at);

-- Add rating and review_count columns to products table for product reviews summary

ALTER TABLE products
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;




-- Update the rating check constraint to allow 0 for replies
ALTER TABLE product_reviews
DROP CONSTRAINT IF EXISTS product_reviews_rating_check;

ALTER TABLE product_reviews
ADD CONSTRAINT product_reviews_rating_check
CHECK (rating >= 0 AND rating <= 5);




-- Indexes for product_reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_student_id ON product_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);

-- Trigger to update updated_at on product_reviews
CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_reviews_updated_at();


sel








-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    upload_order INTEGER DEFAULT 0,
    file_size INTEGER,
    storage_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_views table
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE SET NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

-- Create product_favorites table
CREATE TABLE IF NOT EXISTS product_favorites (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, student_id)
);
select * from students;
-- Create product_price_history table
CREATE TABLE IF NOT EXISTS product_price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    changed_by VARCHAR(20) REFERENCES students(student_id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for products and related tables
CREATE INDEX IF NOT EXISTS idx_products_student_id ON products(student_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_hall_id ON products(hall_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_last_bumped ON products(last_bumped_at);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_product_id ON product_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_student_id ON product_favorites(student_id);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on products table
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO product_price_history (product_id, old_price, new_price, changed_by)
        VALUES (OLD.id, OLD.price, NEW.price, NEW.student_id);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for price change logging
CREATE TRIGGER track_product_price_changes
AFTER UPDATE OF price ON products
FOR EACH ROW
EXECUTE FUNCTION log_price_change();

-- Insert some default tags for common product categories
INSERT INTO products (title, price, description, category, condition, contact_method, hall_id, tags)
VALUES
('Sample Physics Textbook', 25.00, 'Like new condition, barely used', 'Books', 'Like New', 'WhatsApp', 1, ARRAY['textbook', 'physics', 'science', 'education']),
('iPhone 12 Pro', 350.00, 'Good condition, comes with charger', 'Electronics', 'Good', 'in_app', 2, ARRAY['iphone', 'smartphone', 'apple', 'mobile']),
('Designer Jeans', 15.00, 'Hardly worn, excellent condition', 'Fashion', 'Like New', 'SMS', 3, ARRAY['jeans', 'fashion', 'clothing', 'designer'])
ON CONFLICT DO NOTHING;

-- ============================
-- SERVICES MODULE MIGRATION
-- ============================

-- Drop existing service tables if they exist
DROP TABLE IF EXISTS service_images CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- Create services table
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0 AND price <= 10000),
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'Tutoring',
            'Laundry & Cleaning',
            'Cooking & Meal Prep',
            'IT & Tech Support',
            'Graphic Design',
            'Other'
        )
    ),
    contact_method VARCHAR(20) NOT NULL CHECK (
        contact_method IN (
            'WhatsApp',
            'Call',
            'SMS',
            'in_app'
        )
    ),
    hall_id INTEGER REFERENCES university_halls(id) ON DELETE SET NULL,
    room_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'available',
            'reserved',
            'archived'
        )
    ),
    is_approved BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    price_negotiable BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_bumped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service_images table
CREATE TABLE service_images (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    upload_order INTEGER DEFAULT 0,
    file_size INTEGER,
    storage_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for services and service_images
CREATE INDEX idx_services_student_id ON services(student_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_hall_id ON services(hall_id);
CREATE INDEX idx_services_price ON services(price);
CREATE INDEX idx_services_created_at ON services(created_at);
CREATE INDEX idx_services_last_bumped ON services(last_bumped_at);
CREATE INDEX idx_services_tags ON services USING GIN(tags);

CREATE INDEX idx_service_images_service_id ON service_images(service_id);

-- Trigger function to update updated_at on services
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_services_updated_at();

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default service categories
INSERT INTO service_categories (name, description, icon) VALUES
('Tutoring', 'Academic tutoring and study help', 'book'),
('Laundry & Cleaning', 'Laundry and cleaning services', 'shirt'),
('Cooking & Meal Prep', 'Cooking and meal preparation', 'chef-hat'),
('IT & Tech Support', 'Technology and IT assistance', 'monitor'),
('Graphic Design', 'Design and creative services', 'palette'),
('Other', 'Other miscellaneous services', 'more-horizontal')
ON CONFLICT (name) DO NOTHING;

-- Create service_bookings table
CREATE TABLE IF NOT EXISTS service_bookings (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    customer_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    provider_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')
    ),
    price DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration to simplify service bookings by making date/time/duration optional
-- This allows for simplified booking requests with just description and budget

-- Make booking_date, booking_time, and duration nullable
ALTER TABLE service_bookings
ALTER COLUMN booking_date DROP NOT NULL,
ALTER COLUMN booking_time DROP NOT NULL,
ALTER COLUMN duration DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON TABLE service_bookings IS 'Service bookings table - booking_date, booking_time, and duration are now optional for simplified booking requests';





-- Create service_reviews table
CREATE TABLE IF NOT EXISTS service_reviews (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES service_bookings(id) ON DELETE CASCADE,
    customer_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    provider_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service_notifications table
CREATE TABLE IF NOT EXISTS service_notifications (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('booking_request', 'booking_confirmed', 'booking_cancelled', 'reminder', 'payment_received')
    ),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for service tables
CREATE INDEX IF NOT EXISTS idx_service_bookings_service_id ON service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_customer_id ON service_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_provider_id ON service_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings(status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_date ON service_bookings(booking_date);

CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_customer_id ON service_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_provider_id ON service_reviews(provider_id);

CREATE INDEX IF NOT EXISTS idx_service_notifications_student_id ON service_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_service_notifications_is_read ON service_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_service_notifications_created_at ON service_notifications(created_at);

-- Trigger to update updated_at on service_bookings
CREATE OR REPLACE FUNCTION update_service_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_service_bookings_updated_at
BEFORE UPDATE ON service_bookings
FOR EACH ROW
EXECUTE FUNCTION update_service_bookings_updated_at();

-- Create cart table
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, product_id)
);




-- Indexes for cart tables
CREATE INDEX IF NOT EXISTS idx_cart_student_id ON cart(student_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);


-- Insert test students for sample services
INSERT INTO students (student_id, first_name, last_name, email, phone, password, is_verified, is_active_service_provider)
VALUES
('TEST001', 'John', 'Doe', 'john.doe@university.edu', '+233201234567', '$2b$10$hashedpassword1', true, true),
('TEST002', 'Jane', 'Smith', 'jane.smith@university.edu', '+233208765432', '$2b$10$hashedpassword2', true, true),
('TEST003', 'Michael', 'Johnson', 'michael.johnson@university.edu', '+233209876543', '$2b$10$hashedpassword3', true, true)
ON CONFLICT (student_id) DO NOTHING;



-- Add missing columns to services table if they don't exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS availability_schedule JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Create delivery codes table for better management
CREATE TABLE IF NOT EXISTS delivery_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by_student_id VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP DEFAULT NULL,
    expires_at TIMESTAMP DEFAULT NULL
);

-- Insert some initial delivery codes
INSERT INTO delivery_codes (code, expires_at) VALUES
('UNYVA-2024DEL', NOW() + INTERVAL '1 year'),
('UNYVA-STUDENT', NOW() + INTERVAL '1 year'),
('UNYVA-RUNNER', NOW() + INTERVAL '1 year'),
('UNYVA-GHANA24', NOW() + INTERVAL '1 year'),
('UNYVA-DELIVER', NOW() + INTERVAL '1 year')
ON CONFLICT (code) DO NOTHING;

-- ============================
-- ORDERS AND DELIVERIES MODULE
-- ============================













-- Alter products table to include 'pending' in status CHECK constraint
ALTER TABLE products DROP CONSTRAINT products_status_check;

ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (
    status IN ('draft', 'available', 'reserved', 'sold', 'archived', 'pending')
);




-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    seller_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    delivery_option VARCHAR(20) NOT NULL CHECK (
        delivery_option IN ('pickup', 'delivery')
    ),
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'delivered', 'cancelled')
    ),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'failed', 'refunded')
    ),
    delivery_hall_id INTEGER REFERENCES university_halls(id) ON DELETE SET NULL,
    delivery_room_number VARCHAR(20),
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    customer_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    seller_id VARCHAR(20) REFERENCES students(student_id) ON DELETE CASCADE,
    delivery_person_id VARCHAR(20) REFERENCES students(student_id) ON DELETE SET NULL,
    pickup_hall_id INTEGER REFERENCES university_halls(id) ON DELETE SET NULL,
    pickup_room_number VARCHAR(20),
    delivery_hall_id INTEGER REFERENCES university_halls(id) ON DELETE SET NULL,
    delivery_room_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')
    ),
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    assigned_at TIMESTAMP DEFAULT NULL,
    started_at TIMESTAMP DEFAULT NULL,
    completed_at TIMESTAMP DEFAULT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders and deliveries
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_option ON orders(delivery_option);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_seller_id ON deliveries(seller_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_person_id ON deliveries(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at);

-- Trigger to update updated_at on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();

-- Trigger to update updated_at on deliveries
CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON deliveries
FOR EACH ROW
EXECUTE FUNCTION update_deliveries_updated_at();

-- Insert sample order and delivery for testing
INSERT INTO orders (order_number, customer_id, seller_id, product_id, quantity, unit_price, total_price, delivery_option, delivery_fee, status, delivery_hall_id, delivery_room_number)
SELECT
    'ORD-001',
    s1.student_id,
    s2.student_id,
    p.id,
    1,
    p.price,
    p.price + 5.00,
    'delivery',
    5.00,
    'confirmed',
    uh.id,
    '123'
FROM students s1
CROSS JOIN students s2
CROSS JOIN products p
CROSS JOIN university_halls uh
WHERE s1.student_id = 'DEL001'
  AND s2.student_id != 'DEL001'
  AND p.student_id = s2.student_id
  AND uh.full_name = 'Commonwealth Hall'
LIMIT 1
ON CONFLICT (order_number) DO NOTHING;

-- Insert corresponding delivery
INSERT INTO deliveries (order_id, customer_id, seller_id, pickup_hall_id, delivery_hall_id, delivery_fee, status, notes)
SELECT
    o.id,
    o.customer_id,
    o.seller_id,
    p.hall_id,
    o.delivery_hall_id,
    o.delivery_fee,
    'pending',
    'Sample delivery request for testing'
FROM orders o
JOIN products p ON o.product_id = p.id
WHERE o.order_number = 'ORD-001'
ON CONFLICT DO NOTHING;




ALTER TABLE students
ADD COLUMN has_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN payment_date TIMESTAMP NULL;

-- Add comment for documentation
COMMENT ON COLUMN students.has_paid IS 'Indicates if student has paid the GH₵5.00 login fee';
COMMENT ON COLUMN students.payment_date IS 'Timestamp when payment was completed';

-- Create index for efficient queries on payment status
CREATE INDEX idx_students_has_paid ON students(has_paid);

-- Optional: Add a check constraint to ensure payment_date is set when has_paid is true
ALTER TABLE students
ADD CONSTRAINT chk_payment_date
CHECK (
  (has_paid = FALSE AND payment_date IS NULL) OR
  (has_paid = TRUE AND payment_date IS NOT NULL)
);




# 🗄️ Complete Database Migration - Nested Comments System

**For:** my_unyva_db on Neon  
**Date:** November 12, 2025  
**Purpose:** Add nested comment support to product_reviews and service_reviews tables

---


-- ============================================
-- NESTED COMMENTS MIGRATION
-- For: product_reviews and service_reviews
-- Database: my_unyva_db (Neon)
-- ============================================

-- ============================================
-- PART 1: UPDATE product_reviews TABLE
-- ============================================

-- Step 1a: Add columns to product_reviews
ALTER TABLE product_reviews 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_root_id INTEGER DEFAULT NULL;

-- Step 2a: Create indexes for product_reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_depth 
ON product_reviews(depth);

CREATE INDEX IF NOT EXISTS idx_product_reviews_thread_root 
ON product_reviews(thread_root_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_parent_product 
ON product_reviews(parent_id, product_id);

-- Step 3a: Update depth values for product_reviews
-- Top-level reviews (no parent)
UPDATE product_reviews 
SET depth = 0
WHERE parent_id IS NULL;

-- First-level replies (replies to reviews)
UPDATE product_reviews pr1
SET depth = 1
WHERE parent_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM product_reviews pr2 
  WHERE pr2.id = pr1.parent_id AND pr2.parent_id IS NOT NULL
);

-- Second-level replies (replies to replies)
UPDATE product_reviews pr1
SET depth = 2
WHERE parent_id IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM product_reviews pr2 
  WHERE pr2.id = pr1.parent_id AND pr2.parent_id IS NOT NULL
);

-- Step 4a: Set thread_root_id for product_reviews
-- For top-level reviews: thread_root_id = their own id
UPDATE product_reviews 
SET thread_root_id = id
WHERE parent_id IS NULL AND thread_root_id IS NULL;

-- For first-level replies: thread_root_id = parent_id
UPDATE product_reviews pr1
SET thread_root_id = pr1.parent_id
WHERE pr1.parent_id IS NOT NULL 
AND pr1.depth = 1
AND pr1.thread_root_id IS NULL;

-- For nested replies: find root through recursive search
WITH RECURSIVE root_finder AS (
  SELECT id, parent_id, parent_id as root_id
  FROM product_reviews
  WHERE parent_id IS NOT NULL AND depth = 2
  
  UNION ALL
  
  SELECT rf.id, pr.parent_id, 
    CASE WHEN pr.parent_id IS NULL THEN pr.id ELSE rf.root_id END
  FROM root_finder rf
  JOIN product_reviews pr ON pr.id = rf.parent_id
  WHERE pr.id IS NOT NULL
)
UPDATE product_reviews pr
SET thread_root_id = (
  SELECT DISTINCT root_id FROM root_finder WHERE root_finder.id = pr.id LIMIT 1
)
WHERE pr.thread_root_id IS NULL AND pr.parent_id IS NOT NULL;

-- ============================================
-- PART 2: UPDATE service_reviews TABLE
-- ============================================

-- Step 1b: Add columns to service_reviews
ALTER TABLE service_reviews 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_root_id INTEGER DEFAULT NULL;

-- Step 2b: Create indexes for service_reviews
CREATE INDEX IF NOT EXISTS idx_service_reviews_depth 
ON service_reviews(depth);

CREATE INDEX IF NOT EXISTS idx_service_reviews_thread_root 
ON service_reviews(thread_root_id);

CREATE INDEX IF NOT EXISTS idx_service_reviews_parent_service 
ON service_reviews(parent_id, service_id);

-- Step 3b: Update depth values for service_reviews
-- Top-level reviews (no parent)
UPDATE service_reviews 
SET depth = 0
WHERE parent_id IS NULL;

-- First-level replies (replies to reviews)
UPDATE service_reviews sr1
SET depth = 1
WHERE parent_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM service_reviews sr2 
  WHERE sr2.id = sr1.parent_id AND sr2.parent_id IS NOT NULL
);

-- Second-level replies (replies to replies)
UPDATE service_reviews sr1
SET depth = 2
WHERE parent_id IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM service_reviews sr2 
  WHERE sr2.id = sr1.parent_id AND sr2.parent_id IS NOT NULL
);

-- Step 4b: Set thread_root_id for service_reviews
-- For top-level reviews: thread_root_id = their own id
UPDATE service_reviews 
SET thread_root_id = id
WHERE parent_id IS NULL AND thread_root_id IS NULL;

-- For first-level replies: thread_root_id = parent_id
UPDATE service_reviews sr1
SET thread_root_id = sr1.parent_id
WHERE sr1.parent_id IS NOT NULL 
AND sr1.depth = 1
AND sr1.thread_root_id IS NULL;

-- For nested replies: find root through recursive search
WITH RECURSIVE root_finder AS (
  SELECT id, parent_id, parent_id as root_id
  FROM service_reviews
  WHERE parent_id IS NOT NULL AND depth = 2
  
  UNION ALL
  
  SELECT rf.id, sr.parent_id, 
    CASE WHEN sr.parent_id IS NULL THEN sr.id ELSE rf.root_id END
  FROM root_finder rf
  JOIN service_reviews sr ON sr.id = rf.parent_id
  WHERE sr.id IS NOT NULL
)
UPDATE service_reviews sr
SET thread_root_id = (
  SELECT DISTINCT root_id FROM root_finder WHERE root_finder.id = sr.id LIMIT 1
)
WHERE sr.thread_root_id IS NULL AND sr.parent_id IS NOT NULL;

-- ============================================
-- PART 3: CREATE SHARED FUNCTIONS
-- ============================================

-- Function to get comment depth (used by triggers)
CREATE OR REPLACE FUNCTION get_comment_depth(comment_id INTEGER, table_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  parent_id_val INTEGER;
  parent_depth INTEGER;
BEGIN
  IF table_name = 'product_reviews' THEN
    SELECT parent_id INTO parent_id_val FROM product_reviews WHERE id = comment_id;
    IF parent_id_val IS NULL THEN
      RETURN 0;
    ELSE
      SELECT depth INTO parent_depth FROM product_reviews WHERE id = parent_id_val;
      RETURN COALESCE(parent_depth, 0) + 1;
    END IF;
  ELSIF table_name = 'service_reviews' THEN
    SELECT parent_id INTO parent_id_val FROM service_reviews WHERE id = comment_id;
    IF parent_id_val IS NULL THEN
      RETURN 0;
    ELSE
      SELECT depth INTO parent_depth FROM service_reviews WHERE id = parent_id_val;
      RETURN COALESCE(parent_depth, 0) + 1;
    END IF;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: CREATE TRIGGERS FOR product_reviews
-- ============================================

-- Function to validate and set depth on product_reviews insert
CREATE OR REPLACE FUNCTION validate_and_set_comment_depth_products()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_root_id INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent's depth
    SELECT depth INTO parent_depth FROM product_reviews WHERE id = NEW.parent_id;
    
    -- Check max depth (3 levels: 0, 1, 2 where 2 is max)
    IF COALESCE(parent_depth, 0) >= 2 THEN
      RAISE EXCEPTION 'Cannot nest comments more than 3 levels deep';
    END IF;
    
    -- Set new comment's depth
    NEW.depth = COALESCE(parent_depth, 0) + 1;
    
    -- Set thread_root_id
    SELECT thread_root_id INTO parent_root_id FROM product_reviews WHERE id = NEW.parent_id;
    NEW.thread_root_id = COALESCE(parent_root_id, NEW.parent_id);
  ELSE
    -- Top-level comment
    NEW.depth = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set thread_root_id after insert for product_reviews
CREATE OR REPLACE FUNCTION set_thread_root_for_toplevel_products()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE product_reviews SET thread_root_id = NEW.id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing product_reviews triggers
DROP TRIGGER IF EXISTS trigger_validate_comment_depth_products ON product_reviews;
DROP TRIGGER IF EXISTS trigger_set_thread_root_products ON product_reviews;

-- Create triggers for product_reviews
CREATE TRIGGER trigger_validate_comment_depth_products
BEFORE INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION validate_and_set_comment_depth_products();

CREATE TRIGGER trigger_set_thread_root_products
AFTER INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION set_thread_root_for_toplevel_products();

-- ============================================
-- PART 5: CREATE TRIGGERS FOR service_reviews
-- ============================================

-- Function to validate and set depth on service_reviews insert
CREATE OR REPLACE FUNCTION validate_and_set_comment_depth_services()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
  parent_root_id INTEGER;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent's depth
    SELECT depth INTO parent_depth FROM service_reviews WHERE id = NEW.parent_id;
    
    -- Check max depth (3 levels: 0, 1, 2 where 2 is max)
    IF COALESCE(parent_depth, 0) >= 2 THEN
      RAISE EXCEPTION 'Cannot nest comments more than 3 levels deep';
    END IF;
    
    -- Set new comment's depth
    NEW.depth = COALESCE(parent_depth, 0) + 1;
    
    -- Set thread_root_id
    SELECT thread_root_id INTO parent_root_id FROM service_reviews WHERE id = NEW.parent_id;
    NEW.thread_root_id = COALESCE(parent_root_id, NEW.parent_id);
  ELSE
    -- Top-level comment
    NEW.depth = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set thread_root_id after insert for service_reviews
CREATE OR REPLACE FUNCTION set_thread_root_for_toplevel_services()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE service_reviews SET thread_root_id = NEW.id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing service_reviews triggers
DROP TRIGGER IF EXISTS trigger_validate_comment_depth_services ON service_reviews;
DROP TRIGGER IF EXISTS trigger_set_thread_root_services ON service_reviews;

-- Create triggers for service_reviews
CREATE TRIGGER trigger_validate_comment_depth_services
BEFORE INSERT ON service_reviews
FOR EACH ROW
EXECUTE FUNCTION validate_and_set_comment_depth_services();

CREATE TRIGGER trigger_set_thread_root_services
AFTER INSERT ON service_reviews
FOR EACH ROW
EXECUTE FUNCTION set_thread_root_for_toplevel_services();

-- ============================================
-- PART 6: ADD DOCUMENTATION
-- ============================================

COMMENT ON COLUMN product_reviews.depth IS 'Nesting level: 0=top-level review, 1-2=nested comments. Max depth is 2 (3 levels total).';
COMMENT ON COLUMN product_reviews.thread_root_id IS 'ID of the root review in this thread. Used for grouping related comments.';

COMMENT ON COLUMN service_reviews.depth IS 'Nesting level: 0=top-level review, 1-2=nested comments. Max depth is 2 (3 levels total).';
COMMENT ON COLUMN service_reviews.thread_root_id IS 'ID of the root review in this thread. Used for grouping related comments.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================



---



-- Check 1: Verify product_reviews columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'product_reviews' 
AND column_name IN ('depth', 'thread_root_id');
-- Should return 2 rows

-- Check 2: Verify service_reviews columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'service_reviews' 
AND column_name IN ('depth', 'thread_root_id');
-- Should return 2 rows

-- Check 3: Verify indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('product_reviews', 'service_reviews')
AND indexname LIKE 'idx_%';
-- Should return 6 rows

-- Check 4: Verify triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table IN ('product_reviews', 'service_reviews');
-- Should return 4 rows

-- Check 5: View data with depth
SELECT id, parent_id, depth, thread_root_id 
FROM product_reviews 
ORDER BY id DESC LIMIT 10;
-- Should show depth values (0, 1, or 2)

SELECT id, parent_id, depth, thread_root_id 
FROM service_reviews 
ORDER BY id DESC LIMIT 10;
-- Should show depth values (0, 1, or 2)
```

---
