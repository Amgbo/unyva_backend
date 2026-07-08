-- Update product category constraint to include new categories
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
    CHECK (category IN (
        'Books', 'Books & Study Materials', 'Phones & Accessories', 'Laptops & Computers',
        'Electronics', 'Electronics & Gadgets', 'Fashion', 'Clothing & Fashion',
        'Hostel Items', 'Hostel Essentials', 'Food', 'Food & Snacks',
        'Sports & Fitness', 'Beauty & Personal Care', 'Stationery & Art Supplies',
        'Furniture & Decor', 'Gaming & Entertainment', 'Transportation', 'Other'
    ));

-- Update service category constraint to include new categories
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_check;
ALTER TABLE services ADD CONSTRAINT services_category_check
    CHECK (category IN (
        'Tutoring', 'Academic Tutoring', 'Writing & Research', 'Laundry & Cleaning',
        'Cooking & Meal Prep', 'Cooking & Meal Services', 'Tech Support & Repairs',
        'IT & Tech Support', 'Graphic Design', 'Graphic Design & Creative',
        'Photography & Videography', 'Transportation & Delivery', 'Fitness & Wellness',
        'Music & Performance', 'Event Planning', 'Language Tutoring',
        'Programming & IT', 'Career Services', 'Other'
    ));

-- Add comment for documentation
COMMENT ON CONSTRAINT products_category_check ON products IS 'Updated to include expanded product categories';
COMMENT ON CONSTRAINT services_category_check ON services IS 'Updated to include expanded service categories';
