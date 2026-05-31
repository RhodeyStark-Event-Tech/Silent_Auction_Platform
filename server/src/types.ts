/**
 * Shared domain types for the silent auction platform.
 * Kept framework-agnostic so they can be reused by routes, services and seed scripts.
 */

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  /** Estimated retail value of the item, in whole US dollars. */
  value: number;
  /** Lowest bid the item will accept. The first bid always starts here. */
  minimum_bid: number;
  /** Bids must move up in multiples of this amount above the minimum. */
  increment: number;
  /**
   * How many identical units are available. 1 for a normal item.
   * For multiples (e.g. 3 bikes) the top `quantity` bidders can win.
   */
  quantity: number;
  /**
   * For multiples only: a bidder must bid at least this amount to actually
   * receive a unit, even if they land in the top `quantity`. Null = no extra
   * threshold beyond `minimum_bid`.
   */
  threshold: number | null;
  /** Optional hero image for the item. Null renders a category placeholder. */
  image_url: string | null;
  /** Donor / contact info shown to the admin (never exposed publicly). */
  contact: string | null;
  /** True if the physical product will be handed out at the event. */
  product_at_event: boolean;
  /** Controls display order on the public page. */
  sort_order: number;
  created_at?: string;
}

export interface Bid {
  id: string;
  item_id: string;
  bidder_name: string;
  bidder_email: string;
  bidder_phone: string;
  amount: number;
  created_at: string;
}

/** A bid as exposed to the public: only initials + amount, never PII. */
export interface PublicBid {
  id: string;
  item_id: string;
  initials: string;
  amount: number;
  created_at: string;
}

/** Seed shape (no generated columns). */
export type SeedItem = Omit<AuctionItem, 'id' | 'created_at'>;
