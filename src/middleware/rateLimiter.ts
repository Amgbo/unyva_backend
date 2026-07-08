import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, keyGenerator, message = 'Too many requests, please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || 'unknown');
    const now = Date.now();

    let entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        error: message,
        retry_after: retryAfter,
      });
      return;
    }

    entry.count += 1;
    next();
  };
};

export const hotspotLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: 'Too many hotspot requests, please slow down.',
  keyGenerator: (req) => {
    const anyReq: any = req;
    return anyReq?.student?.student_id || anyReq?.user?.student_id || req.ip || 'unknown';
  },
});

export default hotspotLimiter;
