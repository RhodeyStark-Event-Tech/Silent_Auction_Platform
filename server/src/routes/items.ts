import { Router, type Request, type Response } from 'express';
import { supabase, ITEMS_TABLE, BIDS_TABLE } from '../supabase.js';
import type { AuctionItem, Bid, PublicBid } from '../types.js';
import { nextMinimumBid, rankBids, toPublicBid } from '../services/bidLogic.js';

export const itemsRouter = Router();

interface ItemWithState extends AuctionItem {
  current_high_bid: number | null;
  next_minimum_bid: number;
  bid_count: number;
  /** Anonymised leaderboard embedded so the client needs only ONE request. */
  bids: PublicBid[];
}

/**
 * Public listing: every item plus its derived bid state AND its anonymised
 * leaderboard, all in one response. Embedding the bids here means the client
 * makes a single request instead of one-per-item (no N+1 fan-out).
 */
itemsRouter.get('/', async (_req: Request, res: Response) => {
  const { data: items, error } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Supabase error loading items:', error);
    res.status(500).json({ error: 'Failed to load auction items.' });
    return;
  }

  // Only the columns we need — never pull bidder email/phone (PII) for a public
  // response, and keep the payload small.
  const { data: bids, error: bidsError } = await supabase
    .from(BIDS_TABLE)
    .select('id, item_id, bidder_name, amount, created_at');

  if (bidsError) {
    console.error('Supabase error loading bids:', bidsError);
    res.status(500).json({ error: 'Failed to load bids.' });
    return;
  }

  const bidsByItem = new Map<string, Bid[]>();
  for (const bid of (bids ?? []) as Bid[]) {
    const list = bidsByItem.get(bid.item_id) ?? [];
    list.push(bid);
    bidsByItem.set(bid.item_id, list);
  }

  const enriched: ItemWithState[] = ((items ?? []) as AuctionItem[]).map((item) => {
    const ranked = rankBids(bidsByItem.get(item.id) ?? []);
    return {
      ...item,
      // Donor contact is admin-only — never expose it on the public endpoint.
      contact: null,
      current_high_bid: ranked[0]?.amount ?? null,
      next_minimum_bid: nextMinimumBid(item, ranked),
      bid_count: ranked.length,
      bids: ranked.map(toPublicBid),
    };
  });

  // Let Vercel's CDN serve repeat loads without re-invoking the function/DB.
  // Short TTL keeps the auction near-live; the client cache-busts right after a
  // bid so the bidder still sees their own bid immediately.
  res.set('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30');
  res.json({ items: enriched });
});

/** Public, anonymised bid leaderboard for a single item (initials + amount). */
itemsRouter.get('/:id/bids', async (req: Request, res: Response) => {
  const itemId = req.params.id;

  const { data: bids, error } = await supabase
    .from(BIDS_TABLE)
    .select('*')
    .eq('item_id', itemId);

  if (error) {
    res.status(500).json({ error: 'Failed to load bids.' });
    return;
  }

  const publicBids = rankBids((bids ?? []) as Bid[]).map(toPublicBid);
  res.json({ bids: publicBids });
});
