import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabase, ITEMS_TABLE, BIDS_TABLE } from '../supabase.js';
import type { AuctionItem, Bid } from '../types.js';
import { toInitials, validateBidAmount } from '../services/bidLogic.js';

export const bidsRouter = Router();

const placeBidSchema = z.object({
  item_id: z.string().uuid('Invalid item.'),
  bidder_name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  bidder_email: z.string().trim().email('Please enter a valid email address.').max(254),
  bidder_phone: z
    .string()
    .trim()
    .min(7, 'Please enter a valid phone number.')
    .max(30)
    .regex(/^[0-9+().\-\s]+$/, 'Phone number contains invalid characters.'),
  amount: z.number().finite().positive(),
});

/** Place a bid. Requires full name, email and phone; amount is validated server-side. */
bidsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = placeBidSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid bid.' });
    return;
  }
  const input = parsed.data;

  const { data: item, error: itemError } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .eq('id', input.item_id)
    .single();

  if (itemError || !item) {
    res.status(404).json({ error: 'Auction item not found.' });
    return;
  }

  const { data: existingBids, error: bidsError } = await supabase
    .from(BIDS_TABLE)
    .select('*')
    .eq('item_id', input.item_id);

  if (bidsError) {
    res.status(500).json({ error: 'Failed to validate bid.' });
    return;
  }

  const validation = validateBidAmount(
    item as AuctionItem,
    (existingBids ?? []) as Bid[],
    input.amount,
  );

  if (!validation.ok) {
    res.status(409).json({ error: validation.message, next_minimum_bid: validation.nextMinimum });
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from(BIDS_TABLE)
    .insert({
      item_id: input.item_id,
      bidder_name: input.bidder_name,
      bidder_email: input.bidder_email.toLowerCase(),
      bidder_phone: input.bidder_phone,
      amount: input.amount,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    res.status(500).json({ error: 'Failed to record bid. Please try again.' });
    return;
  }

  const bid = inserted as Bid;
  // Return only the anonymised view to the bidder.
  res.status(201).json({
    bid: {
      id: bid.id,
      item_id: bid.item_id,
      initials: toInitials(bid.bidder_name),
      amount: bid.amount,
      created_at: bid.created_at,
    },
  });
});
