export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  value: number;
  minimum_bid: number;
  increment: number;
  quantity: number;
  threshold: number | null;
  image_url: string | null;
  contact: string | null;
  product_at_event: boolean;
  sort_order: number;
  // Derived state attached by the API listing.
  current_high_bid: number | null;
  next_minimum_bid: number;
  bid_count: number;
}

export interface PublicBid {
  id: string;
  item_id: string;
  initials: string;
  amount: number;
  created_at: string;
}

/** Full bid record (admin only). */
export interface AdminBid extends PublicBid {
  bidder_name: string;
  bidder_email: string;
  bidder_phone: string;
}

export interface ItemWinner {
  bid: {
    id: string;
    bidder_name: string;
    bidder_email: string;
    bidder_phone: string;
    amount: number;
  };
  rank: number;
}

export interface AuctionResult {
  item: AuctionItem;
  winners: ItemWinner[];
}
