import { Request, Response } from 'express';

export const openProduct = (req: Request, res: Response): void => {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Product ID is required and must be a string' });
    return;
  }

  // Detect user agent to determine platform
  const userAgent = req.get('User-Agent') || '';
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);

  // HTML page that tries to open the app and falls back to store
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Open Unyva App</title>
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
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🛍️</div>
        <div class="title">Open Unyva App</div>
        <div class="subtitle">Tap to open the Unyva app or download it from the store</div>

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
