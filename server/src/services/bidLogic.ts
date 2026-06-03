import type { AuctionItem, Bid, PublicBid } from '../types.js';

/**
 * Pure, framework-free auction rules. Kept side-effect free so they are trivial
 * to reason about and unit test.
 */

/** Derive non-identifying initials from a full name, e.g. "Jane A. Doe" -> "JAD". */
export function toInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter((c): c is string => Boolean(c) && /[a-z]/i.test(c))
    .join('')
    .toUpperCase();
  return initials || '—';
}

export function toPublicBid(bid: Bid): PublicBid {
  return {
    id: bid.id,
    item_id: bid.item_id,
    initials: toInitials(bid.bidder_name),
    amount: bid.amount,
    created_at: bid.created_at,
  };
}

/** Bids sorted strongest-first: higher amount wins, earlier bid breaks ties. */
export function rankBids(bids: Bid[]): Bid[] {
  return [...bids].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

/**
 * The smallest amount a NEW bid must meet for this item right now.
 *
 * - First bid (or any open unit on a multiple) always starts at `minimum_bid`.
 * - Single item with existing bids: must beat the leader by one increment.
 * - Multiple (quantity N) once all N units are contested: must beat the
 *   current lowest winning bid by one increment to displace it.
 */
export function nextMinimumBid(item: AuctionItem, bids: Bid[]): number {
  const ranked = rankBids(bids);
  if (ranked.length < item.quantity) {
    return item.minimum_bid;
  }
  const lowestWinning = ranked[item.quantity - 1];
  // lowestWinning is guaranteed defined here because ranked.length >= quantity >= 1.
  const floor = (lowestWinning?.amount ?? item.minimum_bid) + item.increment;
  return Math.max(floor, item.minimum_bid);
}

export interface BidValidationResult {
  ok: boolean;
  /** The minimum acceptable amount, surfaced to the client either way. */
  nextMinimum: number;
  message?: string;
}

/** Validate a proposed bid amount against the item's rules and current bids. */
export function validateBidAmount(
  item: AuctionItem,
  bids: Bid[],
  amount: number,
): BidValidationResult {
  const nextMinimum = nextMinimumBid(item, bids);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, nextMinimum, message: 'Bid amount must be a positive number.' };
  }

  // Must sit on the increment grid measured from the minimum bid.
  const stepsFromMin = (amount - item.minimum_bid) / item.increment;
  if (!Number.isInteger(stepsFromMin)) {
    return {
      ok: false,
      nextMinimum,
      message: `Bids must be in increments of $${item.increment} starting at $${item.minimum_bid}.`,
    };
  }

  if (amount < nextMinimum) {
    return {
      ok: false,
      nextMinimum,
      message: `The next bid for this item must be at least $${nextMinimum}.`,
    };
  }

  return { ok: true, nextMinimum };
}

export interface ItemWinner {
  bid: Bid;
  rank: number;
}

/**
 * Determine which bidders actually win an item.
 *
 * Winners are the top `quantity` ranked bids that also meet the item's
 * `threshold` (when set). This implements the "multiples" rule: e.g. 3 bikes
 * with a $70 threshold — bids of $80/$90/$100 all win; a 4th place $60 does not.
 */
export function determineWinners(item: AuctionItem, bids: Bid[]): ItemWinner[] {
  const ranked = rankBids(bids);
  const floor = item.threshold ?? item.minimum_bid;
  return ranked
    .slice(0, item.quantity)
    .filter((bid) => bid.amount >= floor)
    .map((bid, index) => ({ bid, rank: index + 1 }));
}

/** One row per winning bidder, ready to write to a spreadsheet. */
export interface WinnerRow {
  name: string;
  email: string;
  phone: string;
  /** e.g. "Twins Tickets ($125); Wine Basket ($45)". */
  items: string;
  /** Sum of this bidder's winning bids. */
  total: number;
  /** Donor contact per item, e.g. "Twins Tickets: Eric Reimer …; Wine Basket: Patty Douglas". */
  donorContacts: string;
}

/**
 * Aggregate per-item winners into one row per bidder (keyed by email), summing
 * what they owe and combining the items they won and the donor contacts for
 * those items. Pure so it is trivial to test.
 */
export function aggregateWinnersByBidder(
  results: { item: AuctionItem; winners: ItemWinner[] }[],
): WinnerRow[] {
  interface Acc {
    name: string;
    email: string;
    phone: string;
    items: string[];
    total: number;
    contacts: string[];
    /** created_at (ms) of the latest winning bid — used to pick the freshest name/phone. */
    latest: number;
  }
  const byEmail = new Map<string, Acc>();

  for (const { item, winners } of results) {
    for (const { bid } of winners) {
      const key = bid.bidder_email.trim().toLowerCase();
      const acc = byEmail.get(key) ?? {
        name: bid.bidder_name,
        email: bid.bidder_email,
        phone: bid.bidder_phone,
        items: [],
        total: 0,
        contacts: [],
        latest: 0,
      };
      const ts = new Date(bid.created_at).getTime();
      if (ts >= acc.latest) {
        acc.name = bid.bidder_name;
        acc.phone = bid.bidder_phone;
        acc.latest = ts;
      }
      acc.items.push(`${item.title} ($${bid.amount})`);
      acc.total += bid.amount;
      acc.contacts.push(`${item.title}: ${item.contact ?? 'no donor contact on file'}`);
      byEmail.set(key, acc);
    }
  }

  return [...byEmail.values()].map((a) => ({
    name: a.name,
    email: a.email,
    phone: a.phone,
    items: a.items.join('; '),
    total: a.total,
    donorContacts: a.contacts.join('; '),
  }));
}
