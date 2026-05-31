import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { itemsRouter } from './routes/items.js';
import { bidsRouter } from './routes/bids.js';
import { adminRouter } from './routes/admin.js';

/**
 * The configured Express app, exported without calling `listen()`.
 *
 * - Locally, `index.ts` imports this and starts a listener.
 * - On Vercel, `api/index.ts` exports this app directly as the serverless
 *   request handler (Vercel invokes an Express app like any `(req, res)` fn).
 */
export const app = express();

// Behind Vercel/proxies, trust the forwarded headers so `req.ip` and rate
// limiting see the real client IP rather than the proxy's.
app.set('trust proxy', true);

app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: config.clientOrigins,
    credentials: true,
  }),
);

// Abuse protection on write-heavy / auth endpoints. Shared (Redis) when
// configured so the limit holds across all serverless instances.
const writeLimiter = createRateLimiter({
  windowSeconds: 60,
  max: config.rateLimit.bidsPerMinute,
  prefix: 'bids',
});
const loginLimiter = createRateLimiter({
  windowSeconds: 15 * 60,
  max: config.rateLimit.loginPer15Min,
  prefix: 'login',
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/items', itemsRouter);
app.use('/api/bids', writeLimiter, bidsRouter);
app.use('/api/admin/login', loginLimiter);
app.use('/api/admin', adminRouter);

// 404 + error fallthrough.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});
