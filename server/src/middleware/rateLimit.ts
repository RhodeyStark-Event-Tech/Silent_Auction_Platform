import type { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { config } from '../config.js';

/**
 * Rate limiting that works on serverless.
 *
 * On Vercel every request may hit a fresh function instance, so the default
 * in-memory limiter (per-instance counters that reset on cold start) is
 * useless — each instance would let through its own quota. When Upstash Redis
 * is configured we use a *shared* sliding-window limiter so the limit is
 * enforced consistently across all instances.
 *
 * With no Upstash creds (local dev) we fall back to the in-memory limiter,
 * which is fine for a single long-running process.
 */

const redis =
  config.upstash.url && config.upstash.token
    ? new Redis({ url: config.upstash.url, token: config.upstash.token })
    : null;

if (!redis && config.nodeEnv === 'production') {
  console.warn(
    '[rateLimit] No Upstash Redis configured in production — falling back to ' +
      'in-memory limits, which are NOT shared across serverless instances. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
  );
}

/**
 * Best-effort client IP. Behind Vercel/proxies the real IP is the first entry
 * in `x-forwarded-for`; fall back to Express's parsed `req.ip`.
 */
function clientIp(req: Request): string {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? 'unknown';
}

const TOO_MANY = {
  error: 'Too many requests. Please slow down and try again in a moment.',
};

export interface RateLimiterOptions {
  /** Sliding window length in seconds. */
  windowSeconds: number;
  /** Max requests allowed per IP within the window. */
  max: number;
  /** Namespacing prefix so different endpoints have independent budgets. */
  prefix: string;
}

/**
 * Create an Express middleware limiter. Uses Upstash when configured, otherwise
 * an in-memory limiter with identical limits.
 */
export function createRateLimiter(opts: RateLimiterOptions): RequestHandler {
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowSeconds} s`),
      prefix: `ratelimit:${opts.prefix}`,
      analytics: false,
    });

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { success, limit, remaining, reset } = await limiter.limit(clientIp(req));
        res.setHeader('RateLimit-Limit', String(limit));
        res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining)));
        res.setHeader('RateLimit-Reset', String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))));
        if (!success) {
          res.status(429).json(TOO_MANY);
          return;
        }
        next();
      } catch (err) {
        // Fail open: a Redis hiccup must not take down bidding during the event.
        console.error('[rateLimit] limiter error, allowing request:', err);
        next();
      }
    };
  }

  return rateLimit({
    windowMs: opts.windowSeconds * 1000,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: TOO_MANY,
  });
}
