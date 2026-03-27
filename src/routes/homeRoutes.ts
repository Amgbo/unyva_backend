import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getFeaturedProducts, getAllProducts, getRecentProducts } from '../models/productModel.js';
import { getProductCategories } from '../models/categoryModel.js';
import { getFeaturedServices, getRecentServices } from '../models/serviceModel.js';
import { pool } from '../db.js';
import { TtlCache } from '../utils/ttlCache.js';
import { logPerf } from '../utils/perfLogger.js';

const router = Router();

const HOME_CACHE_TTL_MS = (Number(process.env.HOME_CACHE_TTL_SECONDS) || 45) * 1000;
type HomeCacheValue = { payload: any; etag: string };
const homeResponseCache = new TtlCache<HomeCacheValue>(HOME_CACHE_TTL_MS);

const safeCacheGet = (key: string): HomeCacheValue | null => {
  try {
    return homeResponseCache.get(key);
  } catch (error) {
    console.warn('Home cache get failed, continuing without cache:', error);
    return null;
  }
};

const safeCacheSet = (key: string, value: HomeCacheValue): void => {
  try {
    homeResponseCache.set(key, value);
  } catch (error) {
    console.warn('Home cache set failed, continuing without cache:', error);
  }
};

// Public home endpoint (no authentication required)
router.get('/', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const cacheKey = `home:${page}:${limit}`;

    const cached = safeCacheGet(cacheKey);
    if (cached) {
      if (req.headers['if-none-match'] === cached.etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.setHeader('ETag', cached.etag);
      res.json(cached.payload);
      logPerf(`GET /api/home cache-hit page=${page} limit=${limit}`, startedAt);
      return;
    }

    const [
      announcementsResult,
      categories,
      recentProducts,
      featuredProducts,
      featuredServices,
      recentServices,
      totalProductsResult,
    ] = await Promise.all([
      pool.query(
        'SELECT id, title, content, image_url, created_at FROM announcements WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 5'
      ),
      getProductCategories(),
      getRecentProducts(10),
      getFeaturedProducts(10),
      getFeaturedServices(10),
      getRecentServices(10),
      pool.query(
        "SELECT COUNT(*)::int AS total FROM products WHERE status IN ('available', 'sold', 'pending') AND is_approved = true"
      ),
    ]);

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
    // Combine and deduplicate services
    const allServices = [...recentServices, ...featuredServices];
    const uniqueServices = allServices.filter((service, index, self) =>
      index === self.findIndex(s => s.id === service.id)
    );

    // Count is fetched with a dedicated query to avoid loading full product payloads.
    const totalProducts = totalProductsResult.rows?.[0]?.total || 0;
    const hasMore = (page * limit) < totalProducts;

    const payload = {
      banners,
      categories,
      products: uniqueProducts.slice(0, limit),
      services: uniqueServices.slice(0, limit),
      hasMore,
      pagination: {
        page,
        limit,
        total: totalProducts
      }
    };

    const etag = `W/\"${createHash('sha1').update(JSON.stringify(payload)).digest('hex')}\"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    safeCacheSet(cacheKey, { payload, etag });

    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.setHeader('ETag', etag);

    res.json(payload);
    logPerf(`GET /api/home cache-miss page=${page} limit=${limit}`, startedAt);
  } catch (err) {
    console.error('Error fetching home data:', err);
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Public home critical endpoint for first paint (smaller payload, faster render)
router.get('/critical', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 6, 10);
    const cacheKey = `home:critical:${limit}`;

    const cached = safeCacheGet(cacheKey);
    if (cached) {
      if (req.headers['if-none-match'] === cached.etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.setHeader('ETag', cached.etag);
      res.json(cached.payload);
      logPerf(`GET /api/home/critical cache-hit limit=${limit}`, startedAt);
      return;
    }

    const [announcementsResult, categories, recentProducts, featuredProducts] = await Promise.all([
      pool.query(
        'SELECT id, title, content, image_url, created_at FROM announcements WHERE image_url IS NOT NULL ORDER BY created_at DESC LIMIT 3'
      ),
      getProductCategories(),
      getRecentProducts(limit),
      getFeaturedProducts(limit),
    ]);

    const banners = announcementsResult.rows.map(announcement => ({
      id: announcement.id.toString(),
      img: announcement.image_url,
      title: announcement.title,
      content: announcement.content,
      created_at: announcement.created_at
    }));

    const allProducts = [...recentProducts, ...featuredProducts];
    const uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex(p => p.id === product.id)
    );

    const payload = {
      mode: 'critical',
      banners,
      categories,
      products: uniqueProducts.slice(0, limit),
    };

    const etag = `W/\"${createHash('sha1').update(JSON.stringify(payload)).digest('hex')}\"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    safeCacheSet(cacheKey, { payload, etag });
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.setHeader('ETag', etag);
    res.json(payload);
    logPerf(`GET /api/home/critical cache-miss limit=${limit}`, startedAt);
  } catch (err) {
    console.error('Error fetching critical home data:', err);
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Public non-critical home sections endpoint for deferred content loading
router.get('/sections', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const cacheKey = `home:sections:${limit}`;

    const cached = safeCacheGet(cacheKey);
    if (cached) {
      if (req.headers['if-none-match'] === cached.etag) {
        res.status(304).end();
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.setHeader('ETag', cached.etag);
      res.json(cached.payload);
      logPerf(`GET /api/home/sections cache-hit limit=${limit}`, startedAt);
      return;
    }

    const [featuredProducts, recentProducts, featuredServices, recentServices] = await Promise.all([
      getFeaturedProducts(limit),
      getRecentProducts(limit),
      getFeaturedServices(limit),
      getRecentServices(limit),
    ]);

    const payload = {
      mode: 'sections',
      products: {
        featured: featuredProducts,
        recent: recentProducts,
      },
      services: {
        featured: featuredServices,
        recent: recentServices,
      },
    };

    const etag = `W/\"${createHash('sha1').update(JSON.stringify(payload)).digest('hex')}\"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    safeCacheSet(cacheKey, { payload, etag });
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.setHeader('ETag', etag);
    res.json(payload);
    logPerf(`GET /api/home/sections cache-miss limit=${limit}`, startedAt);
  } catch (err) {
    console.error('Error fetching deferred home sections:', err);
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Protected home endpoint (requires authentication) - for authenticated users
router.get('/protected', verifyToken, async (req: Request, res: Response) => {
  const startedAt = Date.now();
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Fetch real banners (keeping as is for now, can be updated later)
    const banners = [
      { id: '1', img: 'https://picsum.photos/800/300', title: 'Big Sale' },
      { id: '2', img: 'https://picsum.photos/800/301', title: 'Student Discounts' },
    ];

    const [categories, products, totalProductsResult] = await Promise.all([
      getProductCategories(),
      getFeaturedProducts(limit),
      pool.query(
        "SELECT COUNT(*)::int AS total FROM products WHERE status IN ('available', 'sold', 'pending') AND is_approved = true"
      ),
    ]);

    const totalProducts = totalProductsResult.rows?.[0]?.total || 0;
    const hasMore = (page * limit) < totalProducts;

    res.json({
      banners,
      categories,
      products,
      hasMore,
      pagination: {
        page,
        limit,
        total: totalProducts
      }
    });
    logPerf(`GET /api/home/protected page=${page} limit=${limit}`, startedAt);
  } catch (err) {
    console.error('Error fetching home data:', err);
    res.status(500).json({ message: 'Server error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
