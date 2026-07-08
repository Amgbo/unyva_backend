
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_by" varchar(20),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"image_url" text
);
CREATE TABLE "cart" (
	"id" serial PRIMARY KEY,
	"student_id" varchar(20) UNIQUE,
	"product_id" integer UNIQUE,
	"quantity" integer DEFAULT 1,
	"added_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "cart_student_id_product_id_key" UNIQUE("student_id","product_id"),
	CONSTRAINT "cart_quantity_check" CHECK (quantity > 0)
);
CREATE TABLE "delete_account_requests" (
	"id" serial PRIMARY KEY,
	"full_name" varchar(255) NOT NULL,
	"student_id_or_email" varchar(255) NOT NULL,
	"deletion_message" text NOT NULL,
	"submitted_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(20) DEFAULT 'pending',
	CONSTRAINT "delete_account_requests_status_check" CHECK (status IN ('pending','approved','rejected'))

);
-- Deliveries Table
CREATE TABLE "deliveries" (
    "id" serial PRIMARY KEY,
    "order_id" integer,
    "customer_id" varchar(20),
    "seller_id" varchar(20),
    "delivery_person_id" varchar(20),
    "pickup_hall_id" integer,
    "pickup_room_number" varchar(20),
    "delivery_hall_id" integer,
    "delivery_room_number" varchar(20),
    "status" varchar(20) DEFAULT 'pending',
    "delivery_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
    "notes" text,
    "assigned_at" timestamp,
    "started_at" timestamp,
    "completed_at" timestamp,
    "rating" integer,
    "review" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deliveries_rating_check" CHECK ((rating >= 1 AND rating <= 5)),
    CONSTRAINT "deliveries_status_check" CHECK (status IN ('pending','assigned','in_progress','completed','cancelled'))
);

-- Delivery Codes Table
CREATE TABLE "delivery_codes" (
    "id" serial PRIMARY KEY,
    "code" varchar(20) NOT NULL UNIQUE,
    "is_used" boolean DEFAULT false,
    "used_by_student_id" varchar(20) DEFAULT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "used_at" timestamp,
    "expires_at" timestamp
);

-- Orders Table
CREATE TABLE "orders" (
    "id" serial PRIMARY KEY,
    "order_number" varchar(50) NOT NULL UNIQUE,
    "customer_id" varchar(20),
    "seller_id" varchar(20),
    "product_id" integer,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10, 2) NOT NULL,
    "total_price" numeric(10, 2) NOT NULL,
    "delivery_option" varchar(20) NOT NULL,
    "delivery_fee" numeric(10, 2) DEFAULT '0',
    "status" varchar(20) DEFAULT 'pending',
    "payment_status" varchar(20) DEFAULT 'pending',
    "delivery_hall_id" integer,
    "delivery_room_number" varchar(20),
    "special_instructions" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_delivery_option_check" CHECK (delivery_option IN ('pickup','delivery')),
    CONSTRAINT "orders_payment_status_check" CHECK (payment_status IN ('pending','paid','failed','refunded')),
    CONSTRAINT "orders_quantity_check" CHECK (quantity > 0),
    CONSTRAINT "orders_status_check" CHECK (status IN ('confirmed','processing','assigned','in_progress','shipped','delivered','cancelled'))
);

-- Product Favorites
CREATE TABLE "product_favorites" (
    "id" serial PRIMARY KEY,
    "product_id" integer,
    "student_id" varchar(20),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_favorites_product_id_student_id_key" UNIQUE ("product_id","student_id")
);

-- Product Images
CREATE TABLE "product_images" (
    "id" serial PRIMARY KEY,
    "product_id" integer,
    "image_url" text NOT NULL,
    "thumbnail_url" text,
    "is_primary" boolean DEFAULT false,
    "upload_order" integer DEFAULT 0,
    "file_size" integer,
    "storage_path" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Product Price History
CREATE TABLE "product_price_history" (
    "id" serial PRIMARY KEY,
    "product_id" integer,
    "old_price" numeric(10, 2),
    "new_price" numeric(10, 2),
    "changed_by" varchar(20),
    "changed_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Product Reviews
CREATE TABLE "product_reviews" (
    "id" serial PRIMARY KEY,
    "product_id" integer,
    "student_id" varchar(20),
    "rating" integer,
    "title" varchar(255),
    "comment" text NOT NULL,
    "order_id" integer,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "parent_id" integer,
    "depth" integer DEFAULT 0,
    "thread_root_id" integer,
    CONSTRAINT "product_reviews_rating_check" CHECK (rating >= 0 AND rating <= 5)
);

-- Product Views
CREATE TABLE "product_views" (
    "id" serial PRIMARY KEY,
    "product_id" integer,
    "student_id" varchar(20),
    "viewed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "ip_address" varchar(45)
);

-- Products Table
CREATE TABLE "products" (
    "id" serial PRIMARY KEY,
    "student_id" varchar(20),
    "title" varchar(255) NOT NULL,
    "price" numeric(10, 2) NOT NULL,
    "description" text NOT NULL,
    "category" varchar(50) NOT NULL,
    "condition" varchar(20) DEFAULT 'Good' NOT NULL,
    "contact_method" varchar(20) NOT NULL,
    "hall_id" integer,
    "room_number" varchar(20),
    "status" varchar(20) DEFAULT 'draft',
    "is_approved" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "price_negotiable" boolean DEFAULT false,
    "tags" text[],
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "last_bumped_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "rating" numeric(3,2) DEFAULT '0',
    "review_count" integer DEFAULT 0,
    "quantity" integer DEFAULT 1,
    CONSTRAINT "products_category_check" CHECK (category IN ('Books','Electronics','Fashion','Hostel Items','Food','Other')),
    CONSTRAINT "products_condition_check" CHECK (condition IN ('New','Used','Like New','Good','Fair')),
    CONSTRAINT "products_contact_method_check" CHECK (contact_method IN ('WhatsApp','Call','SMS','in_app')),
    CONSTRAINT "products_price_check" CHECK (price >= 0 AND price <= 10000),
    CONSTRAINT "products_quantity_check" CHECK (quantity >= 0),
    CONSTRAINT "products_status_check" CHECK (status IN ('draft','available','reserved','sold','archived','pending'))
);

CREATE TABLE "service_bookings" (
    "id" serial PRIMARY KEY,
    "service_id" integer,
    "customer_id" varchar(20),
    "provider_id" varchar(20),
    "booking_date" date,
    "booking_time" time,
    "duration" integer,
    "status" varchar(20) DEFAULT 'pending',
    "price" numeric(10, 2) NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_bookings_status_check" 
        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'))
);

CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY,
	"name" varchar(50) NOT NULL CONSTRAINT "service_categories_name_key" UNIQUE,
	"description" text,
	"icon" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "service_images" (
	"id" serial PRIMARY KEY,
	"service_id" integer,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"is_primary" boolean DEFAULT false,
	"upload_order" integer DEFAULT 0,
	"file_size" integer,
	"storage_path" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "service_notifications" (
    "id" serial PRIMARY KEY,
    "student_id" varchar(20),
    "type" varchar(50) NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "data" jsonb,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_notifications_type_check"
        CHECK (type IN ('booking_request', 'booking_confirmed', 'booking_cancelled', 'reminder', 'payment_received'))
);

CREATE TABLE "service_reviews" (
    "id" serial PRIMARY KEY,
    "service_id" integer,
    "booking_id" integer,
    "customer_id" varchar(20),
    "provider_id" varchar(20),
    "rating" integer NOT NULL,
    "title" varchar(255),
    "comment" text,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "depth" integer DEFAULT 0,
    "thread_root_id" integer,
    "parent_id" integer,
    CONSTRAINT "service_reviews_rating_check" 
        CHECK (
            (parent_id IS NULL AND rating BETWEEN 1 AND 5)
            OR
            (parent_id IS NOT NULL AND (rating IS NULL OR rating = 0))
        )
);

CREATE TABLE "services" (
    "id" serial PRIMARY KEY,
    "student_id" varchar(20),
    "title" varchar(255) NOT NULL,
    "description" text NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "category" varchar(50) NOT NULL,
    "contact_method" varchar(20) NOT NULL,
    "hall_id" integer,
    "room_number" varchar(20),
    "status" varchar(20) DEFAULT 'draft',
    "is_approved" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "price_negotiable" boolean DEFAULT false,
    "tags" text[],
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "last_bumped_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "availability_schedule" jsonb,
    "image_urls" text[],
    "rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    CONSTRAINT "services_category_check" 
        CHECK (category IN ('Tutoring', 'Laundry & Cleaning', 'Cooking & Meal Prep', 'IT & Tech Support', 'Graphic Design', 'Other')),
    CONSTRAINT "services_contact_method_check" 
        CHECK (contact_method IN ('WhatsApp', 'Call', 'SMS', 'in_app')),
    CONSTRAINT "services_price_check" 
        CHECK (price >= 0 AND price <= 10000),
    CONSTRAINT "services_status_check" 
        CHECK (status IN ('draft', 'available', 'reserved', 'archived'))
);

CREATE TABLE "students" (
    "student_id" varchar(20) PRIMARY KEY,
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    "email" varchar(150) NOT NULL UNIQUE,
    "phone" varchar(20),
    "gender" varchar(10),
    "hall_of_residence" text,
    "date_of_birth" date,
    "profile_picture" text,
    "id_card" text,
    "password" text,
    "is_verified" boolean DEFAULT false,
    "verification_token" varchar(255),
    "role" varchar(20) DEFAULT 'buyer_seller',
    "delivery_code" varchar(20),
    "is_delivery_approved" boolean DEFAULT false,
    "university" varchar(255),
    "program" varchar(255),
    "graduation_year" integer,
    "rating" numeric(3,2) DEFAULT 5.0,
    "total_ratings" integer DEFAULT 0,
    "room_number" varchar(20),
    "is_active_seller" boolean DEFAULT false,
    "is_active_service_provider" boolean DEFAULT false,
    "seller_rating" numeric(3,2) DEFAULT 5.0,
    "seller_review_count" integer DEFAULT 0,
    "service_provider_rating" numeric(3,2) DEFAULT 5.0,
    "service_review_count" integer DEFAULT 0,
    "delivery_rating" numeric(3,2) DEFAULT 5.0,
    "delivery_review_count" integer DEFAULT 0,
    "total_transactions" integer DEFAULT 0,
    "last_active" timestamp DEFAULT CURRENT_TIMESTAMP,
    "profile_completion_score" integer DEFAULT 0,
    "preferred_contact_method" varchar(20) DEFAULT 'in_app',
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
    "registration_complete" boolean DEFAULT false,
    "has_paid" boolean DEFAULT false,
    "payment_date" timestamp,
    CONSTRAINT "chk_payment_date" 
        CHECK ((has_paid = false AND payment_date IS NULL) OR (has_paid = true AND payment_date IS NOT NULL))
);

CREATE TABLE "university_halls" (
    "id" serial PRIMARY KEY,
    "full_name" varchar(100) NOT NULL UNIQUE,
    "short_name" varchar(20),
    "description" text,
    "location_zone" varchar(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);


-- ===============================
-- Foreign Key Constraints
-- ===============================

-- Announcements
ALTER TABLE "announcements"
    ADD CONSTRAINT "announcements_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "students"("student_id")
    ON DELETE SET NULL;

-- Cart
ALTER TABLE "cart"
    ADD CONSTRAINT "cart_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

ALTER TABLE "cart"
    ADD CONSTRAINT "cart_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Deliveries
ALTER TABLE "deliveries"
    ADD CONSTRAINT "deliveries_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

ALTER TABLE "deliveries"
    ADD CONSTRAINT "deliveries_delivery_hall_id_fkey"
    FOREIGN KEY ("delivery_hall_id") REFERENCES "university_halls"("id")
    ON DELETE SET NULL;

ALTER TABLE "deliveries"
    ADD CONSTRAINT "deliveries_delivery_person_id_fkey"
    FOREIGN KEY ("delivery_person_id") REFERENCES "students"("student_id")
    ON DELETE SET NULL;

ALTER TABLE "deliveries"
    ADD CONSTRAINT "deliveries_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE CASCADE;

ALTER TABLE "deliveries"
    ADD CONSTRAINT "deliveries_pickup_hall_id_fkey"
    FOREIGN KEY ("pickup_hall_id") REFERENCES "university_halls"("id")
    ON DELETE SET NULL;

ALTER TABLE "deliveries"
    ADD CONSTRAINT "deliveries_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Orders
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_delivery_hall_id_fkey"
    FOREIGN KEY ("delivery_hall_id") REFERENCES "university_halls"("id")
    ON DELETE SET NULL;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Product Favorites
ALTER TABLE "product_favorites"
    ADD CONSTRAINT "product_favorites_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

ALTER TABLE "product_favorites"
    ADD CONSTRAINT "product_favorites_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Product Images
ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

-- Product Price History
ALTER TABLE "product_price_history"
    ADD CONSTRAINT "product_price_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "students"("student_id")
    ON DELETE SET NULL;

ALTER TABLE "product_price_history"
    ADD CONSTRAINT "product_price_history_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

-- Product Reviews
ALTER TABLE "product_reviews"
    ADD CONSTRAINT "product_reviews_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "product_reviews"("id")
    ON DELETE CASCADE;

ALTER TABLE "product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

ALTER TABLE "product_reviews"
    ADD CONSTRAINT "product_reviews_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Product Views
ALTER TABLE "product_views"
    ADD CONSTRAINT "product_views_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE;

ALTER TABLE "product_views"
    ADD CONSTRAINT "product_views_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE SET NULL;

-- Products
ALTER TABLE "products"
    ADD CONSTRAINT "products_hall_id_fkey"
    FOREIGN KEY ("hall_id") REFERENCES "university_halls"("id")
    ON DELETE SET NULL;

ALTER TABLE "products"
    ADD CONSTRAINT "products_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Service Bookings
ALTER TABLE "service_bookings"
    ADD CONSTRAINT "service_bookings_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

ALTER TABLE "service_bookings"
    ADD CONSTRAINT "service_bookings_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

ALTER TABLE "service_bookings"
    ADD CONSTRAINT "service_bookings_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE CASCADE;

-- Service Images
ALTER TABLE "service_images"
    ADD CONSTRAINT "service_images_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE CASCADE;

-- Service Notifications
ALTER TABLE "service_notifications"
    ADD CONSTRAINT "service_notifications_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- Service Reviews
ALTER TABLE "service_reviews"
    ADD CONSTRAINT "service_reviews_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "service_bookings"("id")
    ON DELETE CASCADE;

ALTER TABLE "service_reviews"
    ADD CONSTRAINT "service_reviews_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

ALTER TABLE "service_reviews"
    ADD CONSTRAINT "service_reviews_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "service_reviews"("id")
    ON DELETE CASCADE;

ALTER TABLE "service_reviews"
    ADD CONSTRAINT "service_reviews_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

ALTER TABLE "service_reviews"
    ADD CONSTRAINT "service_reviews_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE CASCADE;

-- Services
ALTER TABLE "services"
    ADD CONSTRAINT "services_hall_id_fkey"
    FOREIGN KEY ("hall_id") REFERENCES "university_halls"("id")
    ON DELETE SET NULL;

ALTER TABLE "services"
    ADD CONSTRAINT "services_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
    ON DELETE CASCADE;

-- ===============================
-- Indexes
-- ===============================

-- (Indexes can be similarly grouped by table, if needed)




-- Add registration_complete column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT FALSE;

-- Update existing records to be considered complete if they have password set
UPDATE students SET registration_complete = TRUE WHERE password IS NOT NULL AND password != '';

-- Add comment to the column
COMMENT ON COLUMN students.registration_complete IS 'Indicates if student registration is fully complete (Step 1 + Step 2)';
