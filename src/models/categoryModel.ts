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
          WHEN name = 'Electronics' THEN 'Phones, laptops, chargers, gadgets, and electronic devices'
          WHEN name = 'Fashion' THEN 'Clothing, shoes, accessories, and personal style items'
          WHEN name = 'Hostel Items' THEN 'Furniture, bedding, kitchenware, and dorm essentials'
          WHEN name = 'Food' THEN 'Snacks, groceries, cooked meals, and food items'
          WHEN name = 'Other' THEN 'Miscellaneous items that don''t fit other categories'
          ELSE 'Items in this category'
        END as description,
        CASE
          WHEN name = 'Books' THEN 'book-outline'
          WHEN name = 'Electronics' THEN 'phone-portrait-outline'
          WHEN name = 'Fashion' THEN 'shirt-outline'
          WHEN name = 'Hostel Items' THEN 'home-outline'
          WHEN name = 'Food' THEN 'restaurant-outline'
          WHEN name = 'Other' THEN 'bag-outline'
          ELSE 'bag-outline'
        END as icon,
        CASE
          WHEN name = 'Books' THEN '#3B82F6'
          WHEN name = 'Electronics' THEN '#10B981'
          WHEN name = 'Fashion' THEN '#F59E0B'
          WHEN name = 'Hostel Items' THEN '#8B5CF6'
          WHEN name = 'Food' THEN '#EF4444'
          WHEN name = 'Other' THEN '#6B7280'
          ELSE '#6B7280'
        END as color,
        true as is_active,
        CASE
          WHEN name = 'Books' THEN 1
          WHEN name = 'Electronics' THEN 2
          WHEN name = 'Fashion' THEN 3
          WHEN name = 'Hostel Items' THEN 4
          WHEN name = 'Food' THEN 5
          WHEN name = 'Other' THEN 6
          ELSE 99
        END as sort_order,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM unnest(ARRAY['Books', 'Electronics', 'Fashion', 'Hostel Items', 'Food', 'Other']) AS name
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
          WHEN name = 'Electronics' THEN 'Phones, laptops, chargers, gadgets, and electronic devices'
          WHEN name = 'Fashion' THEN 'Clothing, shoes, accessories, and personal style items'
          WHEN name = 'Hostel Items' THEN 'Furniture, bedding, kitchenware, and dorm essentials'
          WHEN name = 'Food' THEN 'Snacks, groceries, cooked meals, and food items'
          WHEN name = 'Other' THEN 'Miscellaneous items that don''t fit other categories'
          ELSE 'Items in this category'
        END as description,
        CASE
          WHEN name = 'Books' THEN 'book-outline'
          WHEN name = 'Electronics' THEN 'phone-portrait-outline'
          WHEN name = 'Fashion' THEN 'shirt-outline'
          WHEN name = 'Hostel Items' THEN 'home-outline'
          WHEN name = 'Food' THEN 'restaurant-outline'
          WHEN name = 'Other' THEN 'bag-outline'
          ELSE 'bag-outline'
        END as icon,
        CASE
          WHEN name = 'Books' THEN '#3B82F6'
          WHEN name = 'Electronics' THEN '#10B981'
          WHEN name = 'Fashion' THEN '#F59E0B'
          WHEN name = 'Hostel Items' THEN '#8B5CF6'
          WHEN name = 'Food' THEN '#EF4444'
          WHEN name = 'Other' THEN '#6B7280'
          ELSE '#6B7280'
        END as color,
        true as is_active,
        CASE
          WHEN name = 'Books' THEN 1
          WHEN name = 'Electronics' THEN 2
          WHEN name = 'Fashion' THEN 3
          WHEN name = 'Hostel Items' THEN 4
          WHEN name = 'Food' THEN 5
          WHEN name = 'Other' THEN 6
          ELSE 99
        END as sort_order,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM unnest(ARRAY['Books', 'Electronics', 'Fashion', 'Hostel Items', 'Food', 'Other']) AS name
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
