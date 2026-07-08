import { Router, Request, Response } from 'express';

const router = Router();

const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.amgbo.unyvaapp';
const APP_STORE_URL = 'https://apps.apple.com/gh/app/unyva/id6755722173';

/**
 * Detects the device family from the request's User-Agent header.
 * Returns 'android' | 'ios' | 'desktop'.
 */
function detectDevice(userAgent: string | undefined): 'android' | 'ios' | 'desktop' {
  const ua = (userAgent || '').toLowerCase();

  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';

  return 'desktop';
}

/**
 * Renders the fallback download page for desktop/unknown devices.
 */
function renderDownloadPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Download Unyva</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .container {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      max-width: 480px;
      width: 100%;
      padding: 48px 32px;
      text-align: center;
    }

    .logo {
      width: 100px;
      height: 100px;
      object-fit: contain;
      margin-bottom: 24px;
      border-radius: 20px;
    }

    .logo-placeholder {
      width: 100px;
      height: 100px;
      margin: 0 auto 24px;
      border-radius: 20px;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      font-size: 14px;
    }

    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 12px;
    }

    p {
      font-size: 16px;
      color: #555;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 17px;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .btn-android {
      background: #3ddc84;
      color: #000;
    }

    .btn-ios {
      background: #007aff;
      color: #fff;
    }

    .icon {
      width: 22px;
      height: 22px;
    }

    @media (max-width: 360px) {
      .container {
        padding: 36px 20px;
      }

      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Replace src with the actual Unyva logo path or base64 string -->
    <img
      src="/unyva-logo.png"
      alt="Unyva logo"
      class="logo"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
    />
    <div class="logo-placeholder" style="display: none;">Logo</div>

    <h1>Download Unyva</h1>
    <p>Get the best campus marketplace experience. Buy, sell and connect with fellow students right from your phone.</p>

    <div class="buttons">
      <a href="${GOOGLE_PLAY_URL}" class="btn btn-android" target="_blank" rel="noopener noreferrer">
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.716 2.715L6.358 23.12a1.504 1.504 0 0 1-.934.38 1.515 1.515 0 0 1-.15-.012l8.225-10.881zm4.346-2.934l3.063 1.763c.64.369.64 1.293 0 1.662l-3.063 1.763-2.83-2.83 2.83-2.83-2.83-2.83 2.83-2.83zM5.474.654l8.225 10.88-2.716 2.716L4.274 1.044c.04-.005.08-.008.12-.008.36 0 .72.096 1.08.618z"/>
        </svg>
        Download for Android
      </a>
      <a href="${APP_STORE_URL}" class="btn btn-ios" target="_blank" rel="noopener noreferrer">
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.84-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        Download for iPhone
      </a>
    </div>
  </div>
</body>
</html>`;
}

router.get('/', (req: Request, res: Response) => {
  const device = detectDevice(req.headers['user-agent']);

  if (device === 'android') {
    return res.redirect(302, GOOGLE_PLAY_URL);
  }

  if (device === 'ios') {
    return res.redirect(302, APP_STORE_URL);
  }

  return res.status(200).send(renderDownloadPage());
});

export default router;
