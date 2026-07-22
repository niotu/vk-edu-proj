import { Request, Response, NextFunction } from 'express';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.removeHeader('X-Powered-By');
  next();
}

interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

export function rateLimit({ windowMs, limit }: RateLimitOptions) {
  const counters = new Map<string, Counter>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, counter] of counters) {
      if (counter.resetAt <= now) {
        counters.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let counter = counters.get(key);

    if (!counter || counter.resetAt <= now) {
      counter = { count: 0, resetAt: now + windowMs };
      counters.set(key, counter);
    }

    counter.count += 1;
    const remaining = Math.max(0, limit - counter.count);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(remaining));

    if (counter.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((counter.resetAt - now) / 1000)));
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMITED',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
