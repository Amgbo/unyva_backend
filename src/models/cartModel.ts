import { pool } from '../db.js';

export interface CartItem {
  id: number;
  student_id: string;
  product_id: number;
  quantity: number;
  added_at: Date;
  title: string;
  price: number;
  images: { image_url: string }[];
  seller_student_id: string;
  first_name: string;
  last_name: string;
  product_quantity: number; // Available stock quantity
}

// Get all cart items for a student
export async function getCartItems(studentId: string): Promise<CartItem[]> {
  try {
  const query = `
    SELECT
      c.*,
      p.id as product_id,
      p.title,
      p.price,
      p.student_id as seller_student_id,
      s.first_name,
      s.last_name,
      COALESCE(
        json_agg(
          json_build_object('image_url', pi.image_url)
        ) FILTER (WHERE pi.image_url IS NOT NULL),
        '[]'
      ) as images
    FROM cart c
    JOIN products p ON c.product_id = p.id
    JOIN students s ON p.student_id = s.student_id
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
    WHERE c.student_id = $1
    GROUP BY c.id, p.id, p.title, p.price, p.student_id, s.first_name, s.last_name, c.added_at
    ORDER BY c.added_at DESC
  `;

    const result = await pool.query(query, [studentId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching cart items:', error);
    throw new Error('Failed to fetch cart items');
  }
}

// Add item to cart
export async function addToCart(studentId: string, productId: number, quantity: number = 1): Promise<CartItem> {
  try {
    // Check if item already exists in cart
    const existingQuery = `
      SELECT id, quantity FROM cart
      WHERE student_id = $1 AND product_id = $2
    `;
    const existing = await pool.query(existingQuery, [studentId, productId]);

    if (existing.rows.length > 0) {
      // Update quantity if item exists
      const updateQuery = `
        UPDATE cart
        SET quantity = quantity + $3, added_at = CURRENT_TIMESTAMP
        WHERE student_id = $1 AND product_id = $2
        RETURNING id, student_id, product_id, quantity, added_at
      `;
      const result = await pool.query(updateQuery, [studentId, productId, quantity]);
      const cartItem = result.rows[0];

      // Get full item with product details
      const fullItemQuery = `
        SELECT
          c.*,
          p.id as product_id,
          p.title,
          p.price,
          p.quantity as product_quantity,
          p.student_id as seller_student_id,
          s.first_name,
          s.last_name,
          COALESCE(
            json_agg(
              json_build_object('image_url', pi.image_url)
            ) FILTER (WHERE pi.image_url IS NOT NULL),
            '[]'
          ) as images
        FROM cart c
        JOIN products p ON c.product_id = p.id
        JOIN students s ON p.student_id = s.student_id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
        WHERE c.id = $1
        GROUP BY c.id, p.id, p.title, p.price, p.quantity, p.student_id, s.first_name, s.last_name, c.added_at
      `;
      const fullResult = await pool.query(fullItemQuery, [cartItem.id]);
      return fullResult.rows[0];
    } else {
      // Insert new item if it doesn't exist
      const insertQuery = `
        INSERT INTO cart (student_id, product_id, quantity)
        VALUES ($1, $2, $3)
        RETURNING id, student_id, product_id, quantity, added_at
      `;
      const result = await pool.query(insertQuery, [studentId, productId, quantity]);
      const cartItem = result.rows[0];

      // Get full item with product details
      const fullItemQuery = `
        SELECT
          c.*,
          p.id as product_id,
          p.title,
          p.price,
          p.quantity as product_quantity,
          p.student_id as seller_student_id,
          s.first_name,
          s.last_name,
          COALESCE(
            json_agg(
              json_build_object('image_url', pi.image_url)
            ) FILTER (WHERE pi.image_url IS NOT NULL),
            '[]'
          ) as images
        FROM cart c
        JOIN products p ON c.product_id = p.id
        JOIN students s ON p.student_id = s.student_id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
        WHERE c.id = $1
        GROUP BY c.id, p.id, p.title, p.price, p.quantity, p.student_id, s.first_name, s.last_name, c.added_at
      `;
      const fullResult = await pool.query(fullItemQuery, [cartItem.id]);
      return fullResult.rows[0];
    }
  } catch (error) {
    console.error('Error adding item to cart:', error);
    throw new Error('Failed to add item to cart');
  }
}

// Update cart item quantity
export async function updateCartItemQuantity(cartItemId: number, quantity: number): Promise<CartItem | null> {
  try {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await pool.query('DELETE FROM cart WHERE id = $1', [cartItemId]);
      return null;
    }

    const query = `
      UPDATE cart
      SET quantity = $2, added_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, student_id, product_id, quantity, added_at
    `;
    const result = await pool.query(query, [cartItemId, quantity]);
    const cartItem = result.rows[0];

    if (!cartItem) return null;

    // Get full item with product details
    const fullItemQuery = `
      SELECT
        c.*,
        p.id as product_id,
        p.title,
        p.price,
        p.quantity as product_quantity,
        p.student_id as seller_student_id,
        s.first_name,
        s.last_name,
        COALESCE(
          json_agg(
            json_build_object('image_url', pi.image_url)
          ) FILTER (WHERE pi.image_url IS NOT NULL),
          '[]'
        ) as images
      FROM cart c
      JOIN products p ON c.product_id = p.id
      JOIN students s ON p.student_id = s.student_id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE c.id = $1
      GROUP BY c.id, p.id, p.title, p.price, p.quantity, p.student_id, s.first_name, s.last_name, c.added_at
    `;
    const fullResult = await pool.query(fullItemQuery, [cartItem.id]);
    return fullResult.rows[0] || null;
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    throw new Error('Failed to update cart item quantity');
  }
}

// Remove item from cart
export async function removeCartItem(cartItemId: number): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM cart WHERE id = $1', [cartItemId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error removing cart item:', error);
    throw new Error('Failed to remove cart item');
  }
}

// Clear entire cart for a student
export async function clearCart(studentId: string): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM cart WHERE student_id = $1', [studentId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw new Error('Failed to clear cart');
  }
}

// Get cart total for a student
export async function getCartTotal(studentId: string): Promise<{ totalItems: number; totalPrice: number }> {
  try {
    const query = `
      SELECT
        COALESCE(SUM(c.quantity), 0) as total_items,
        COALESCE(SUM(c.quantity * p.price), 0) as total_price
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.student_id = $1
    `;
    const result = await pool.query(query, [studentId]);
    const row = result.rows[0];
    return {
      totalItems: parseInt(row.total_items) || 0,
      totalPrice: parseFloat(row.total_price) || 0
    };
  } catch (error) {
    console.error('Error calculating cart total:', error);
    throw new Error('Failed to calculate cart total');
  }
}
