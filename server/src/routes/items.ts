import { Router, type Request, type Response } from 'express';
import { supabase, ITEMS_TABLE, BIDS_TABLE } from '../supabase.js';
import type { AuctionItem, Bid } from '../types.js';
import { nextMinimumBid, rankBids, toPublicBid } from '../services/bidLogic.js';

export const itemsRouter = Router();

interface ItemWithState extends AuctionItem {
  current_high_bid: number | null;
  next_minimum_bid: number;
  bid_count: number;
}

/** Public listing: every item plus its derived bid state (no PII). */
itemsRouter.get('/', async (_req: Request, res: Response) => {
  const { data: items, error } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Failed to load auction items.' });
    return;
  }

  const { data: bids, error: bidsError } = await supabase
    .from(BIDS_TABLE)
    .select('*');

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

  const enriched: ItemWithState[] = ((items ?? []) as AuctionItem[]).map((item) => {
    const itemBids = bidsByItem.get(item.id) ?? [];
    const ranked = rankBids(itemBids);
    return {
      ...item,
      // Donor contact is admin-only — never expose it on the public endpoint.
      contact: null,
      current_high_bid: ranked[0]?.amount ?? null,
      next_minimum_bid: nextMinimumBid(item, itemBids),
      bid_count: itemBids.length,
    };
  });

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
