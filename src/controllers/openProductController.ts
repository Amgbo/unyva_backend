import { Request, Response } from 'express';
import { getProductById } from '../models/productModel.js';

// Production API URL for constructing full image URLs
const API_BASE_URL = 'https://unyva.up.railway.app';

export const openProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Product ID is required and must be a string' });
    return;
  }

  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: 'Product ID must be a valid number' });
    return;
  }

  // Try to fetch product details for Open Graph tags
  let product = null;
  let productTitle = 'Unyva Student Store';
  let productDescription = 'Check out this product on Unyva Student Store!';
  let productImage = '';
  let productPrice = '';

  try {
    product = await getProductById(productId);
    
    if (product) {
      // Set product-specific meta tags
      productTitle = product.title || 'Unyva Product';
      
      // Format price
      const price = product.price;
      productPrice = `GH₵${price}`;
      productDescription = `${productTitle} - ${productPrice}`;
      if (product.condition) {
        productDescription += ` (${product.condition})`;
      }
      if (product.category) {
        productDescription += ` - ${product.category}`;
      }
      
      // Get primary image URL
      if (product.images && product.images.length > 0) {
        // Find primary image or use first image
        const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
        if (primaryImage && primaryImage.image_url) {
          // Handle both relative and absolute URLs
          productImage = primaryImage.image_url.startsWith('http') 
            ? primaryImage.image_url 
            : `${API_BASE_URL}${primaryImage.image_url}`;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching product for open-product:', error);
    // Continue with default values if product fetch fails
  }

  // Detect user agent to determine platform
  const userAgent = req.get('User-Agent') || '';
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);

  // Current URL for OG tags
  const currentUrl = `${API_BASE_URL}/api/open-product?id=${id}`;

  // HTML page with Open Graph meta tags for social media preview
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productTitle}</title>
    
    <!-- Open Graph / Facebook / WhatsApp Meta Tags -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${productTitle}" />
    <meta property="og:description" content="${productDescription}" />
    <meta property="og:url" content="${currentUrl}" />
    ${productImage ? `<meta property="og:image" content="${productImage}" />
    <meta property="og:image:secure_url" content="${productImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />` : ''}
    ${productPrice ? `<meta property="product:price:amount" content="${productPrice.replace('GH₵', '')}" />
    <meta property="product:price:currency" content="GHS" />` : ''}
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${productTitle}" />
    <meta name="twitter:description" content="${productDescription}" />
    ${productImage ? `<meta name="twitter:image" content="${productImage}" />` : ''}
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .container {
            max-width: 400px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 32px;
            line-height: 1.5;
        }
        .button {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 16px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 8px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .loading {
            display: none;
            margin-top: 20px;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .product-preview {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .product-preview img {
            width: 100%;
            max-height: 200px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .product-preview .price {
            font-size: 20px;
            font-weight: 700;
            color: #ffd700;
        }
    </style>
</head>
<body>
    <div class="container">
        ${product ? `
        <div class="product-preview">
            ${productImage ? `<img src="${productImage}" alt="${productTitle}" />` : '<div class="logo">🛍️</div>'}
            <div class="title">${productTitle}</div>
            ${productPrice ? `<div class="price">${productPrice}</div>` : ''}
        </div>
        ` : `
        <div class="logo">🛍️</div>
        <div class="title">Open Unyva App</div>
        <div class="subtitle">Tap to open the Unyva app or download it from the store</div>
        `}

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Opening app...</p>
        </div>

        <a href="unyvaapp://product/${id}" class="button" id="openButton" onclick="showLoading()">
            Open in Unyva App
        </a>

        ${isAndroid ? `
        <a href="https://play.google.com/store/apps/details?id=com.amgbo.unyvaapp" class="button">
            Download on Google Play
        </a>
        ` : isIOS ? `
        <a href="https://apps.apple.com/app/idYOUR_APPLE_ID" class="button">
            Download on App Store
        </a>
        ` : `
        <a href="https://play.google.com/store/apps/details?id=com.amgbo.unyvaapp" class="button">
            Download on Google Play
        </a>
        <a href="https://apps.apple.com/app/idYOUR_APPLE_ID" class="button">
            Download on App Store
        </a>
        `}
    </div>

    <script>
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('openButton').style.display = 'none';
        }

        // Try to open the app immediately
        window.location = "unyvaapp://product/${id}";

        // After 1.5 seconds, show the download buttons if app didn't open
        setTimeout(function() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('openButton').style.display = 'inline-block';
        }, 1500);
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
