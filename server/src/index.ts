import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { itemsRouter } from './routes/items.js';
import { bidsRouter } from './routes/bids.js';
import { adminRouter } from './routes/admin.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: config.clientOrigins,
    credentials: true,
  }),
);

// Basic abuse protection on write-heavy public endpoints.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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

app.listen(config.port, () => {
  console.info(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
