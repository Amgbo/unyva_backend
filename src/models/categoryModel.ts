// src/models/categoryModel.ts
import { pool } from '../db.js';

// Product categories with metadata
export interface ProductCategory {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// Service categories with metadata
export interface ServiceCategory {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// Category statistics
export interface CategoryStats {
  category: string;
  product_count: number;
  service_count: number;
  total_count: number;
}

// Get all product categories
export const getProductCategories = async (): Promise<ProductCategory[]> => {
  try {
    const query = `
      SELECT
        name as id,
        name,
        INITCAP(REPLACE(name, ' ', ' ')) as display_name,
        CASE
          WHEN name = 'Books' THEN 'Textbooks, novels, study materials, and educational resources'
          WHEN name = 'Books & Study Materials' THEN 'Textbooks, notebooks, study guides, past papers, and educational resources'
          WHEN name = 'Phones & Accessories' THEN 'Mobile phones, cases, chargers, screen protectors, earbuds, and phone accessories'
          WHEN name = 'Laptops & Computers' THEN 'Laptops, tablets, computer accessories, peripherals, and computing devices'
          WHEN name = 'Electronics' THEN 'Phones, laptops, chargers, gadgets, and electronic devices'
          WHEN name = 'Electronics & Gadgets' THEN 'Headphones, speakers, smartwatches, power banks, cables, and electronic gadgets'
          WHEN name = 'Fashion' THEN 'Clothing, shoes, accessories, and personal style items'
          WHEN name = 'Clothing & Fashion' THEN 'Shirts, pants, shoes, accessories, jewelry, and personal style items'
          WHEN name = 'Hostel Items' THEN 'Furniture, bedding, kitchenware, and dorm essentials'
          WHEN name = 'Hostel Essentials' THEN 'Bedding, pillows, kitchen items, storage solutions, lamps, and dorm essentials'
          WHEN name = 'Food' THEN 'Snacks, groceries, cooked meals, and food items'
          WHEN name = 'Food & Snacks' THEN 'Instant noodles, canned goods, snacks, beverages, cooking ingredients'
          WHEN name = 'Sports & Fitness' THEN 'Dumbbells, yoga mats, sports shoes, bicycles, fitness accessories'
          WHEN name = 'Beauty & Personal Care' THEN 'Skincare, makeup, hair products, toiletries, grooming items'
          WHEN name = 'Stationery & Art Supplies' THEN 'Pens, notebooks, art materials, calculators, planners'
          WHEN name = 'Furniture & Decor' THEN 'Desks, chairs, shelves, posters, room decorations'
          WHEN name = 'Gaming & Entertainment' THEN 'Consoles, games, controllers, books, musical instruments'
          WHEN name = 'Transportation' THEN 'Bicycles, helmets, locks, skateboards, scooter accessories'
          WHEN name = 'Other' THEN 'Miscellaneous items that don''t fit other categories'
          ELSE 'Items in this category'
        END as description,
        CASE
          WHEN name = 'Books' THEN 'book-outline'
          WHEN name = 'Books & Study Materials' THEN 'book-outline'
          WHEN name = 'Phones & Accessories' THEN 'phone-portrait-outline'
          WHEN name = 'Laptops & Computers' THEN 'laptop-outline'
          WHEN name = 'Electronics' THEN 'phone-portrait-outline'
          WHEN name = 'Electronics & Gadgets' THEN 'headphones-outline'
          WHEN name = 'Fashion' THEN 'shirt-outline'
          WHEN name = 'Clothing & Fashion' THEN 'shirt-outline'
          WHEN name = 'Hostel Items' THEN 'home-outline'
          WHEN name = 'Hostel Essentials' THEN 'home-outline'
          WHEN name = 'Food' THEN 'restaurant-outline'
          WHEN name = 'Food & Snacks' THEN 'restaurant-outline'
          WHEN name = 'Sports & Fitness' THEN 'fitness-outline'
          WHEN name = 'Beauty & Personal Care' THEN 'color-palette-outline'
          WHEN name = 'Stationery & Art Supplies' THEN 'pencil-outline'
          WHEN name = 'Furniture & Decor' THEN 'sofa-outline'
          WHEN name = 'Gaming & Entertainment' THEN 'game-controller-outline'
          WHEN name = 'Transportation' THEN 'bicycle-outline'
          WHEN name = 'Other' THEN 'bag-outline'
          ELSE 'bag-outline'
        END as icon,
        CASE
          WHEN name = 'Books' THEN '#3B82F6'
          WHEN name = 'Books & Study Materials' THEN '#1E40AF'
          WHEN name = 'Phones & Accessories' THEN '#059669'
          WHEN name = 'Laptops & Computers' THEN '#0D9488'
          WHEN name = 'Electronics' THEN '#10B981'
          WHEN name = 'Electronics & Gadgets' THEN '#047857'
          WHEN name = 'Fashion' THEN '#F59E0B'
          WHEN name = 'Clothing & Fashion' THEN '#D97706'
          WHEN name = 'Hostel Items' THEN '#8B5CF6'
          WHEN name = 'Hostel Essentials' THEN '#7C3AED'
          WHEN name = 'Food' THEN '#EF4444'
          WHEN name = 'Food & Snacks' THEN '#DC2626'
          WHEN name = 'Sports & Fitness' THEN '#EA580C'
          WHEN name = 'Beauty & Personal Care' THEN '#DB2777'
          WHEN name = 'Stationery & Art Supplies' THEN '#C2410C'
          WHEN name = 'Furniture & Decor' THEN '#7C2D12'
          WHEN name = 'Gaming & Entertainment' THEN '#365314'
          WHEN name = 'Transportation' THEN '#166534'
          WHEN name = 'Other' THEN '#6B7280'
          ELSE '#6B7280'
        END as color,
        true as is_active,
        CASE
          WHEN name = 'Books' THEN 1
          WHEN name = 'Books & Study Materials' THEN 2
          WHEN name = 'Phones & Accessories' THEN 3
          WHEN name = 'Laptops & Computers' THEN 4
          WHEN name = 'Electronics' THEN 5
          WHEN name = 'Electronics & Gadgets' THEN 6
          WHEN name = 'Fashion' THEN 7
          WHEN name = 'Clothing & Fashion' THEN 8
          WHEN name = 'Hostel Items' THEN 9
          WHEN name = 'Hostel Essentials' THEN 10
          WHEN name = 'Food' THEN 11
          WHEN name = 'Food & Snacks' THEN 12
          WHEN name = 'Sports & Fitness' THEN 13
          WHEN name = 'Beauty & Personal Care' THEN 14
          WHEN name = 'Stationery & Art Supplies' THEN 15
          WHEN name = 'Furniture & Decor' THEN 16
          WHEN name = 'Gaming & Entertainment' THEN 17
          WHEN name = 'Transportation' THEN 18
          WHEN name = 'Other' THEN 19
          ELSE 99
        END as sort_order,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM unnest(ARRAY['Books', 'Books & Study Materials', 'Phones & Accessories', 'Laptops & Computers', 'Electronics', 'Electronics & Gadgets', 'Fashion', 'Clothing & Fashion', 'Hostel Items', 'Hostel Essentials', 'Food', 'Food & Snacks', 'Sports & Fitness', 'Beauty & Personal Care', 'Stationery & Art Supplies', 'Furniture & Decor', 'Gaming & Entertainment', 'Transportation', 'Other']) AS name
      ORDER BY sort_order
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching product categories:', error);
    throw new Error('Failed to fetch product categories');
  }
};

// Get all service categories
export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    const query = `
      SELECT
        name as id,
        name,
        INITCAP(REPLACE(name, ' & ', ' & ')) as display_name,
        CASE
          WHEN name = 'Tutoring' THEN 'Academic help, study sessions, and educational support'
          WHEN name = 'Laundry & Cleaning' THEN 'Washing, folding, cleaning services for clothes and spaces'
          WHEN name = 'Cooking & Meal Prep' THEN 'Meal preparation, cooking, and food services'
          WHEN name = 'IT & Tech Support' THEN 'Computer help, software setup, and technical assistance'
          WHEN name = 'Graphic Design' THEN 'Design work, logos, posters, and creative services'
          WHEN name = 'Other' THEN 'Miscellaneous services that don''t fit other categories'
          ELSE 'Services in this category'
        END as description,
        CASE
          WHEN name = 'Tutoring' THEN 'school-outline'
          WHEN name = 'Laundry & Cleaning' THEN 'shirt-outline'
          WHEN name = 'Cooking & Meal Prep' THEN 'restaurant-outline'
          WHEN name = 'IT & Tech Support' THEN 'laptop-outline'
          WHEN name = 'Graphic Design' THEN 'color-palette-outline'
          WHEN name = 'Other' THEN 'construct-outline'
          ELSE 'construct-outline'
        END as icon,
        CASE
          WHEN name = 'Tutoring' THEN '#3B82F6'
          WHEN name = 'Laundry & Cleaning' THEN '#10B981'
          WHEN name = 'Cooking & Meal Prep' THEN '#F59E0B'
          WHEN name = 'IT & Tech Support' THEN '#8B5CF6'
          WHEN name = 'Graphic Design' THEN '#EF4444'
          WHEN name = 'Other' THEN '#6B7280'
          ELSE '#6B7280'
        END as color,
        true as is_active,
        CASE
          WHEN name = 'Tutoring' THEN 1
          WHEN name = 'Laundry & Cleaning' THEN 2
          WHEN name = 'Cooking & Meal Prep' THEN 3
          WHEN name = 'IT & Tech Support' THEN 4
          WHEN name = 'Graphic Design' THEN 5
          WHEN name = 'Other' THEN 6
          ELSE 99
        END as sort_order,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM unnest(ARRAY['Tutoring', 'Laundry & Cleaning', 'Cooking & Meal Prep', 'IT & Tech Support', 'Graphic Design', 'Other']) AS name
      ORDER BY sort_order
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching service categories:', error);
    throw new Error('Failed to fetch service categories');
  }
};

// Get category statistics
export const getCategoryStats = async (): Promise<CategoryStats[]> => {
  try {
    const query = `
      SELECT
        category,
        COUNT(*) FILTER (WHERE table_name = 'products') as product_count,
        COUNT(*) FILTER (WHERE table_name = 'services') as service_count,
        COUNT(*) as total_count
      FROM (
        SELECT category, 'products' as table_name FROM products
        UNION ALL
        SELECT category, 'services' as table_name FROM services
      ) combined
      GROUP BY category
      ORDER BY total_count DESC, category
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching category statistics:', error);
    throw new Error('Failed to fetch category statistics');
  }
};

// Get single product category by name
export const getProductCategoryByName = async (categoryName: string): Promise<ProductCategory | null> => {
  try {
    const query = `
      SELECT
        name as id,
        name,
        INITCAP(REPLACE(name, ' ', ' ')) as display_name,
        CASE
          WHEN name = 'Books' THEN 'Textbooks, novels, study materials, and educational resources'
          WHEN name = 'Books & Study Materials' THEN 'Textbooks, notebooks, study guides, past papers, and educational resources'
          WHEN name = 'Phones & Accessories' THEN 'Mobile phones, cases, chargers, screen protectors, earbuds, and phone accessories'
          WHEN name = 'Laptops & Computers' THEN 'Laptops, tablets, computer accessories, peripherals, and computing devices'
          WHEN name = 'Electronics' THEN 'Phones, laptops, chargers, gadgets, and electronic devices'
          WHEN name = 'Electronics & Gadgets' THEN 'Headphones, speakers, smartwatches, power banks, cables, and electronic gadgets'
          WHEN name = 'Fashion' THEN 'Clothing, shoes, accessories, and personal style items'
          WHEN name = 'Clothing & Fashion' THEN 'Shirts, pants, shoes, accessories, jewelry, and personal style items'
          WHEN name = 'Hostel Items' THEN 'Furniture, bedding, kitchenware, and dorm essentials'
          WHEN name = 'Hostel Essentials' THEN 'Bedding, pillows, kitchen items, storage solutions, lamps, and dorm essentials'
          WHEN name = 'Food' THEN 'Snacks, groceries, cooked meals, and food items'
          WHEN name = 'Food & Snacks' THEN 'Instant noodles, canned goods, snacks, beverages, cooking ingredients'
          WHEN name = 'Sports & Fitness' THEN 'Dumbbells, yoga mats, sports shoes, bicycles, fitness accessories'
          WHEN name = 'Beauty & Personal Care' THEN 'Skincare, makeup, hair products, toiletries, grooming items'
          WHEN name = 'Stationery & Art Supplies' THEN 'Pens, notebooks, art materials, calculators, planners'
          WHEN name = 'Furniture & Decor' THEN 'Desks, chairs, shelves, posters, room decorations'
          WHEN name = 'Gaming & Entertainment' THEN 'Consoles, games, controllers, books, musical instruments'
          WHEN name = 'Transportation' THEN 'Bicycles, helmets, locks, skateboards, scooter accessories'
          WHEN name = 'Other' THEN 'Miscellaneous items that don''t fit other categories'
          ELSE 'Items in this category'
        END as description,
        CASE
          WHEN name = 'Books' THEN 'book-outline'
          WHEN name = 'Books & Study Materials' THEN 'book-outline'
          WHEN name = 'Phones & Accessories' THEN 'phone-portrait-outline'
          WHEN name = 'Laptops & Computers' THEN 'laptop-outline'
          WHEN name = 'Electronics' THEN 'phone-portrait-outline'
          WHEN name = 'Electronics & Gadgets' THEN 'headphones-outline'
          WHEN name = 'Fashion' THEN 'shirt-outline'
          WHEN name = 'Clothing & Fashion' THEN 'shirt-outline'
          WHEN name = 'Hostel Items' THEN 'home-outline'
          WHEN name = 'Hostel Essentials' THEN 'home-outline'
          WHEN name = 'Food' THEN 'restaurant-outline'
          WHEN name = 'Food & Snacks' THEN 'restaurant-outline'
          WHEN name = 'Sports & Fitness' THEN 'fitness-outline'
          WHEN name = 'Beauty & Personal Care' THEN 'color-palette-outline'
          WHEN name = 'Stationery & Art Supplies' THEN 'pencil-outline'
          WHEN name = 'Furniture & Decor' THEN 'sofa-outline'
          WHEN name = 'Gaming & Entertainment' THEN 'game-controller-outline'
          WHEN name = 'Transportation' THEN 'bicycle-outline'
          WHEN name = 'Other' THEN 'bag-outline'
          ELSE 'bag-outline'
        END as icon,
        CASE
          WHEN name = 'Books' THEN '#3B82F6'
          WHEN name = 'Books & Study Materials' THEN '#1E40AF'
          WHEN name = 'Phones & Accessories' THEN '#059669'
          WHEN name = 'Laptops & Computers' THEN '#0D9488'
          WHEN name = 'Electronics' THEN '#10B981'
          WHEN name = 'Electronics & Gadgets' THEN '#047857'
          WHEN name = 'Fashion' THEN '#F59E0B'
          WHEN name = 'Clothing & Fashion' THEN '#D97706'
          WHEN name = 'Hostel Items' THEN '#8B5CF6'
          WHEN name = 'Hostel Essentials' THEN '#7C3AED'
          WHEN name = 'Food' THEN '#EF4444'
          WHEN name = 'Food & Snacks' THEN '#DC2626'
          WHEN name = 'Sports & Fitness' THEN '#EA580C'
          WHEN name = 'Beauty & Personal Care' THEN '#DB2777'
          WHEN name = 'Stationery & Art Supplies' THEN '#C2410C'
          WHEN name = 'Furniture & Decor' THEN '#7C2D12'
          WHEN name = 'Gaming & Entertainment' THEN '#365314'
          WHEN name = 'Transportation' THEN '#166534'
          WHEN name = 'Other' THEN '#6B7280'
          ELSE '#6B7280'
        END as color,
        true as is_active,
        CASE
          WHEN name = 'Books' THEN 1
          WHEN name = 'Books & Study Materials' THEN 2
          WHEN name = 'Phones & Accessories' THEN 3
          WHEN name = 'Laptops & Computers' THEN 4
          WHEN name = 'Electronics' THEN 5
          WHEN name = 'Electronics & Gadgets' THEN 6
          WHEN name = 'Fashion' THEN 7
          WHEN name = 'Clothing & Fashion' THEN 8
          WHEN name = 'Hostel Items' THEN 9
          WHEN name = 'Hostel Essentials' THEN 10
          WHEN name = 'Food' THEN 11
          WHEN name = 'Food & Snacks' THEN 12
          WHEN name = 'Sports & Fitness' THEN 13
          WHEN name = 'Beauty & Personal Care' THEN 14
          WHEN name = 'Stationery & Art Supplies' THEN 15
          WHEN name = 'Furniture & Decor' THEN 16
          WHEN name = 'Gaming & Entertainment' THEN 17
          WHEN name = 'Transportation' THEN 18
          WHEN name = 'Other' THEN 19
          ELSE 99
        END as sort_order,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM unnest(ARRAY['Books', 'Books & Study Materials', 'Phones & Accessories', 'Laptops & Computers', 'Electronics', 'Electronics & Gadgets', 'Fashion', 'Clothing & Fashion', 'Hostel Items', 'Hostel Essentials', 'Food', 'Food & Snacks', 'Sports & Fitness', 'Beauty & Personal Care', 'Stationery & Art Supplies', 'Furniture & Decor', 'Gaming & Entertainment', 'Transportation', 'Other']) AS name
      WHERE name = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [categoryName]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching product category by name:', error);
    throw new Error('Failed to fetch product category');
  }
};

// Get single service category by name
export const getServiceCategoryByName = async (categoryName: string): Promise<ServiceCategory | null> => {
  try {
    const query = `
      SELECT
        name as id,
        name,
        INITCAP(REPLACE(name, ' & ', ' & ')) as display_name,
        CASE
          WHEN name = 'Tutoring' THEN 'Academic help, study sessions, and educational support'
          WHEN name = 'Academic Tutoring' THEN 'Subject-specific help, exam preparation, study groups'
          WHEN name = 'Writing & Research' THEN 'Essay writing, research papers, thesis help, editing'
          WHEN name = 'Laundry & Cleaning' THEN 'Washing, folding, cleaning services for clothes and spaces'
          WHEN name = 'Cooking & Meal Prep' THEN 'Meal preparation, cooking, and food services'
          WHEN name = 'Cooking & Meal Services' THEN 'Home-cooked meals, meal planning, baking services'
          WHEN name = 'Tech Support & Repairs' THEN 'Phone/laptop repairs, software help, data recovery'
          WHEN name = 'IT & Tech Support' THEN 'Computer help, software setup, and technical assistance'
          WHEN name = 'Graphic Design' THEN 'Design work, logos, posters, and creative services'
          WHEN name = 'Graphic Design & Creative' THEN 'Logo design, posters, social media graphics, branding'
          WHEN name = 'Photography & Videography' THEN 'Event photography, portraits, video editing, tutorials'
          WHEN name = 'Transportation & Delivery' THEN 'Campus rides, package delivery, errand services'
          WHEN name = 'Fitness & Wellness' THEN 'Personal training, yoga classes, massage, nutrition advice'
          WHEN name = 'Music & Performance' THEN 'DJ services, music lessons, event entertainment'
          WHEN name = 'Event Planning' THEN 'Party planning, decorations, coordination, hosting'
          WHEN name = 'Language Tutoring' THEN 'Foreign language lessons, conversation practice'
          WHEN name = 'Programming & IT' THEN 'Coding help, website development, app development'
          WHEN name = 'Career Services' THEN 'Resume writing, interview prep, job search assistance'
          WHEN name = 'Other' THEN 'Miscellaneous services that don''t fit other categories'
          ELSE 'Services in this category'
        END as description,
        CASE
          WHEN name = 'Tutoring' THEN 'school-outline'
          WHEN name = 'Academic Tutoring' THEN 'school-outline'
          WHEN name = 'Writing & Research' THEN 'pencil-outline'
          WHEN name = 'Laundry & Cleaning' THEN 'shirt-outline'
          WHEN name = 'Cooking & Meal Prep' THEN 'restaurant-outline'
          WHEN name = 'Cooking & Meal Services' THEN 'restaurant-outline'
          WHEN name = 'Tech Support & Repairs' THEN 'laptop-outline'
          WHEN name = 'IT & Tech Support' THEN 'laptop-outline'
          WHEN name = 'Graphic Design' THEN 'color-palette-outline'
          WHEN name = 'Graphic Design & Creative' THEN 'color-palette-outline'
          WHEN name = 'Photography & Videography' THEN 'camera-outline'
          WHEN name = 'Transportation & Delivery' THEN 'car-outline'
          WHEN name = 'Fitness & Wellness' THEN 'fitness-outline'
          WHEN name = 'Music & Performance' THEN 'music-note-outline'
          WHEN name = 'Event Planning' THEN 'calendar-outline'
          WHEN name = 'Language Tutoring' THEN 'translate-outline'
          WHEN name = 'Programming & IT' THEN 'code-outline'
          WHEN name = 'Career Services' THEN 'briefcase-outline'
          WHEN name = 'Other' THEN 'construct-outline'
          ELSE 'construct-outline'
        END as icon,
        CASE
          WHEN name = 'Tutoring' THEN '#3B82F6'
          WHEN name = 'Academic Tutoring' THEN '#1E40AF'
          WHEN name = 'Writing & Research' THEN '#059669'
          WHEN name = 'Laundry & Cleaning' THEN '#10B981'
          WHEN name = 'Cooking & Meal Prep' THEN '#F59E0B'
          WHEN name = 'Cooking & Meal Services' THEN '#D97706'
          WHEN name = 'Tech Support & Repairs' THEN '#8B5CF6'
          WHEN name = 'IT & Tech Support' THEN '#7C3AED'
          WHEN name = 'Graphic Design' THEN '#EF4444'
          WHEN name = 'Graphic Design & Creative' THEN '#DC2626'
          WHEN name = 'Photography & Videography' THEN '#EA580C'
          WHEN name = 'Transportation & Delivery' THEN '#C2410C'
          WHEN name = 'Fitness & Wellness' THEN '#9A3412'
          WHEN name = 'Music & Performance' THEN '#365314'
          WHEN name = 'Event Planning' THEN '#166534'
          WHEN name = 'Language Tutoring' THEN '#14532D'
          WHEN name = 'Programming & IT' THEN '#1E3A8A'
          WHEN name = 'Career Services' THEN '#92400E'
          WHEN name = 'Other' THEN '#6B7280'
          ELSE '#6B7280'
        END as color,
        true as is_active,
        CASE
          WHEN name = 'Tutoring' THEN 1
          WHEN name = 'Academic Tutoring' THEN 2
          WHEN name = 'Writing & Research' THEN 3
          WHEN name = 'Laundry & Cleaning' THEN 4
          WHEN name = 'Cooking & Meal Prep' THEN 5
          WHEN name = 'Cooking & Meal Services' THEN 6
          WHEN name = 'Tech Support & Repairs' THEN 7
          WHEN name = 'IT & Tech Support' THEN 8
          WHEN name = 'Graphic Design' THEN 9
          WHEN name = 'Graphic Design & Creative' THEN 10
          WHEN name = 'Photography & Videography' THEN 11
          WHEN name = 'Transportation & Delivery' THEN 12
          WHEN name = 'Fitness & Wellness' THEN 13
          WHEN name = 'Music & Performance' THEN 14
          WHEN name = 'Event Planning' THEN 15
          WHEN name = 'Language Tutoring' THEN 16
          WHEN name = 'Programming & IT' THEN 17
          WHEN name = 'Career Services' THEN 18
          WHEN name = 'Other' THEN 19
          ELSE 99
        END as sort_order,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM unnest(ARRAY['Tutoring', 'Academic Tutoring', 'Writing & Research', 'Laundry & Cleaning', 'Cooking & Meal Prep', 'Cooking & Meal Services', 'Tech Support & Repairs', 'IT & Tech Support', 'Graphic Design', 'Graphic Design & Creative', 'Photography & Videography', 'Transportation & Delivery', 'Fitness & Wellness', 'Music & Performance', 'Event Planning', 'Language Tutoring', 'Programming & IT', 'Career Services', 'Other']) AS name
      WHERE name = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [categoryName]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error fetching service category by name:', error);
    throw new Error('Failed to fetch service category');
  }
};

// Get popular categories (based on listing count)
export const getPopularCategories = async (limit: number = 10): Promise<CategoryStats[]> => {
  try {
    const query = `
      SELECT
        category,
        COUNT(*) FILTER (WHERE table_name = 'products') as product_count,
        COUNT(*) FILTER (WHERE table_name = 'services') as service_count,
        COUNT(*) as total_count
      FROM (
        SELECT category, 'products' as table_name FROM products
        UNION ALL
        SELECT category, 'services' as table_name FROM services
      ) combined
      GROUP BY category
      ORDER BY total_count DESC, category
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching popular categories:', error);
    throw new Error('Failed to fetch popular categories');
  }
};
