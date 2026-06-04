import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabase, ITEMS_TABLE, BIDS_TABLE } from '../supabase.js';
import type { AuctionItem, Bid } from '../types.js';
import { issueAdminToken, requireAdmin, verifyAdminCredentials } from '../middleware/auth.js';
import { aggregateWinnersByBidder, determineWinners } from '../services/bidLogic.js';
import { sendWinnerEmail } from '../services/email.js';
import { exportWinnersToSheet } from '../services/sheetsExport.js';

export const adminRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

/** Admin login — issues a JWT for the single authorised account. */
adminRouter.post('/login', (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const { email, password } = parsed.data;

  if (!verifyAdminCredentials(email, password)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  res.json({ token: issueAdminToken(), email: email.toLowerCase() });
});

// Everything below requires a valid admin session.
adminRouter.use(requireAdmin);

/** Confirm a token is still valid (used by the client on load). */
adminRouter.get('/me', (_req: Request, res: Response) => {
  res.json({ role: 'admin' });
});

const itemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(''),
  value: z.number().nonnegative(),
  minimum_bid: z.number().nonnegative(),
  increment: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  threshold: z.number().nonnegative().nullable().default(null),
  // Accept a full URL (https://…) OR a site-relative path (e.g. /items/x.jpg)
  // so item photos can live in client/public alongside the hero/gallery.
  image_url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v),
      'Image must be a full URL (https://…) or a path starting with "/".',
    )
    .nullable()
    .default(null),
  contact: z.string().trim().max(300).nullable().default(null),
  product_at_event: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

function normalizeItem(input: z.infer<typeof itemSchema>) {
  return {
    ...input,
    image_url: input.image_url === '' ? null : input.image_url,
  };
}

/** CREATE an auction item. */
adminRouter.post('/items', async (req: Request, res: Response) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid item.' });
    return;
  }

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .insert(normalizeItem(parsed.data))
    .select('*')
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'Failed to create item.' });
    return;
  }
  res.status(201).json({ item: data as AuctionItem });
});

/** UPDATE an auction item. */
adminRouter.put('/items/:id', async (req: Request, res: Response) => {
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid item.' });
    return;
  }

  const patch = { ...parsed.data };
  if (patch.image_url === '') patch.image_url = null;

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .update(patch)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error || !data) {
    res.status(500).json({ error: 'Failed to update item.' });
    return;
  }
  res.json({ item: data as AuctionItem });
});

/** DELETE an auction item (and its bids via FK cascade). */
adminRouter.delete('/items/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from(ITEMS_TABLE).delete().eq('id', req.params.id);
  if (error) {
    res.status(500).json({ error: 'Failed to delete item.' });
    return;
  }
  res.status(204).end();
});

/** Full bid detail (with PII) for the admin only. */
adminRouter.get('/items/:id/bids', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(BIDS_TABLE)
    .select('*')
    .eq('item_id', req.params.id)
    .order('amount', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Failed to load bids.' });
    return;
  }
  res.json({ bids: (data ?? []) as Bid[] });
});

/** Computed winners across every item, honouring multiples + thresholds. */
adminRouter.get('/results', async (_req: Request, res: Response) => {
  const { data: items, error: itemsError } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .order('sort_order', { ascending: true });
  if (itemsError) {
    res.status(500).json({ error: 'Failed to load items.' });
    return;
  }

  const { data: bids, error: bidsError } = await supabase.from(BIDS_TABLE).select('*');
  if (bidsError) {
    res.status(500).json({ error: 'Failed to load bids.' });
    return;
  }

  const bidsByItem = new Map<string, Bid[]>();
  for (const bid of (bids ?? []) as Bid[]) {
    const list = bidsByItem.get(bid.item_id) ?? [];
    list.push(bid);
    bidsByItem.set(bid.item_id, list);
  }

  const results = ((items ?? []) as AuctionItem[]).map((item) => ({
    item,
    winners: determineWinners(item, bidsByItem.get(item.id) ?? []),
  }));

  res.json({ results });
});

const notifySchema = z.object({
  pickup_instructions: z
    .string()
    .trim()
    .min(1, 'Pickup instructions are required.')
    .max(2000),
  item_id: z.string().uuid().optional(),
});

/** Email winners how to collect their prize. Optionally scoped to one item. */
adminRouter.post('/notify-winners', async (req: Request, res: Response) => {
  const parsed = notifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' });
    return;
  }

  let itemsQuery = supabase.from(ITEMS_TABLE).select('*');
  if (parsed.data.item_id) itemsQuery = itemsQuery.eq('id', parsed.data.item_id);
  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) {
    res.status(500).json({ error: 'Failed to load items.' });
    return;
  }

  const { data: bids, error: bidsError } = await supabase.from(BIDS_TABLE).select('*');
  if (bidsError) {
    res.status(500).json({ error: 'Failed to load bids.' });
    return;
  }

  const bidsByItem = new Map<string, Bid[]>();
  for (const bid of (bids ?? []) as Bid[]) {
    const list = bidsByItem.get(bid.item_id) ?? [];
    list.push(bid);
    bidsByItem.set(bid.item_id, list);
  }

  let notified = 0;
  const failures: string[] = [];
  for (const item of (items ?? []) as AuctionItem[]) {
    const winners = determineWinners(item, bidsByItem.get(item.id) ?? []);
    for (const { bid } of winners) {
      try {
        await sendWinnerEmail(item, bid, parsed.data.pickup_instructions);
        notified += 1;
      } catch (err) {
        failures.push(`${item.title} → ${bid.bidder_email}: ${(err as Error).message}`);
      }
    }
  }

  res.json({ notified, failures });
});

/**
 * Export the computed winners to Google Sheets (one row per winning bidder).
 * Recomputes winners, aggregates per bidder, and POSTs to the configured
 * Apps Script webhook, which overwrites the sheet with a fresh snapshot.
 */
adminRouter.post('/export-winners', async (_req: Request, res: Response) => {
  const { data: items, error: itemsError } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .order('sort_order', { ascending: true });
  if (itemsError) {
    res.status(500).json({ error: 'Failed to load items.' });
    return;
  }

  const { data: bids, error: bidsError } = await supabase.from(BIDS_TABLE).select('*');
  if (bidsError) {
    res.status(500).json({ error: 'Failed to load bids.' });
    return;
  }

  const bidsByItem = new Map<string, Bid[]>();
  for (const bid of (bids ?? []) as Bid[]) {
    const list = bidsByItem.get(bid.item_id) ?? [];
    list.push(bid);
    bidsByItem.set(bid.item_id, list);
  }

  const results = ((items ?? []) as AuctionItem[]).map((item) => ({
    item,
    winners: determineWinners(item, bidsByItem.get(item.id) ?? []),
  }));

  const rows = aggregateWinnersByBidder(results);

  try {
    const result = await exportWinnersToSheet(rows);
    res.json({ exported: result.exported });
  } catch (err) {
    console.error('Sheets export failed:', err);
    res.status(502).json({ error: (err as Error).message });
  }
});
