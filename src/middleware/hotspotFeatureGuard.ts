import { Request, Response, NextFunction } from 'express';
import { isHotspotEnabled } from '../config/features.js';

/**
 * Middleware that guards Hotspot routes.
 * When Hotspot is disabled, all incoming requests to Hotspot endpoints are
 * rejected with HTTP 503 Service Unavailable and a standardized error response.
 */
export const hotspotFeatureGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (!isHotspotEnabled()) {
    console.warn(`🔒 [Hotspot][Disabled] Rejected ${req.method} ${req.originalUrl}`);
    res.status(503).json({
      success: false,
      code: 'FEATURE_DISABLED',
      error: 'Hotspot feature is currently disabled',
      message: 'The Hotspot feature is temporarily disabled in this environment.',
    });
    return;
  }

  next();
};

export default hotspotFeatureGuard;
