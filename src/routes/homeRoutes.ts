import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getFeaturedProducts, getAllProducts, getRecentProducts } from '../models/productModel.js';
import { getProductCategories } from '../models/categoryModel.js';
import { getFeaturedServices, getRecentServices } from '../models/serviceModel.js';
import { pool } from '../db.js';

const router = Router();

// Public home endpoint (no authentication required)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Fetch announcements with images as banners
    const announcementsResult = await pool.query(
      'SELECT id, title, content, image_url, created_at FROM announcements WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 5'
    );
    const banners = announcementsResult.rows.map(announcement => ({
      id: announcement.id.toString(),
      img: announcement.image_url,
      title: announcement.title,
      content: announcement.content,
      created_at: announcement.created_at
    }));

    // If no announcements with images, fall back to dummy banners
if (banners.length === 0) {
  banners.push(
    { 
      id: 'dummy-1', 
      img: 'https://res.cloudinary.com/dfdaymnrv/image/upload/v1764345683/unyva-ico_zwjkyn.jpg', 
      title: 'Welcome to Unyva', 
      content: 'Your campus marketplace for buying and selling student essentials', 
      created_at: new Date().toISOString(),
      isDummy: true // Important flag
    } as any,
    { 
      id: 'dummy-2', 
      img: 'https://res.cloudinary.com/dfdaymnrv/image/upload/v1764345646/student_items_yg6wtp.jpg', 
      title: 'Student Essentials', 
      content: 'Find textbooks, electronics, furniture, and more from fellow students', 
      created_at: new Date().toISOString(),
      isDummy: true
    }as any,
    { 
      id: 'dummy-3', 
      img: 'https://res.cloudinary.com/dfdaymnrv/image/upload/v1764345980/man-money-4972188_j97cfc.webp', 
      title: 'Shop Smart', 
      content: 'Save money by buying directly from students on campus', 
      created_at: new Date().toISOString(),
      isDummy: true
    }as any
  );
}

    // Fetch real categories from database
    const categories = await getProductCategories();

    // Fetch recent products (created in last 48 hours) - these will show immediately
    const recentProducts = await getRecentProducts(10);

    // Fetch featured products (popular items)
    const featuredProducts = await getFeaturedProducts(10);

    // Combine and deduplicate products
    const allProducts = [...recentProducts, ...featuredProducts];
    let uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex(p => p.id === product.id)
    );

    // Fallback to all available products if no recent/featured products
    if (uniqueProducts.length === 0) {
      const allAvailableProducts = await getAllProducts();
      uniqueProducts = allAvailableProducts.slice(0, limit);
    }

    // Fetch featured services
    const featuredServices = await getFeaturedServices(10);

    // Fetch recent services
    const recentServices = await getRecentServices(10);

    // Combine and deduplicate services
    const allServices = [...recentServices, ...featuredServices];
    const uniqueServices = allServices.filter((service, index, self) =>
      index === self.findIndex(s => s.id === service.id)
    );

    // Check if there are more products for pagination
    const totalProducts = await getAllProducts();
    const hasMore = (page * limit) < totalProducts.length;

    res.json({
      banners,
      categories,
      products: uniqueProducts.slice(0, limit),
      services: uniqueServices.slice(0, limit),
      hasMore,
      pagination: {
        page,
        limit,
        total: totalProducts.length
      }
    });
  } catch (err) {
    console.error('Error fetching home data:', err);
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Protected home endpoint (requires authentication) - for authenticated users
router.get('/protected', verifyToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Fetch real banners (keeping as is for now, can be updated later)
    const banners = [
      { id: '1', img: 'https://picsum.photos/800/300', title: 'Big Sale' },
      { id: '2', img: 'https://picsum.photos/800/301', title: 'Student Discounts' },
    ];

    // Fetch real categories from database
    const categories = await getProductCategories();

    // Fetch real products from database
    const products = await getFeaturedProducts(limit);

    // Check if there are more products for pagination
    const totalProducts = await getAllProducts();
    const hasMore = (page * limit) < totalProducts.length;

    res.json({
      banners,
      categories,
      products,
      hasMore,
      pagination: {
        page,
        limit,
        total: totalProducts.length
      }
    });
  } catch (err) {
    console.error('Error fetching home data:', err);
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
