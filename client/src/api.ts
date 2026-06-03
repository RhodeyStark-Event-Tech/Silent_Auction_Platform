import type { AuctionItem, PublicBid, AuctionResult } from './types';

const TOKEN_KEY = 'auction_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  nextMinimumBid?: number;
  constructor(message: string, status: number, nextMinimumBid?: number) {
    super(message);
    this.status = status;
    if (nextMinimumBid !== undefined) this.nextMinimumBid = nextMinimumBid;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = data as { error?: string; next_minimum_bid?: number };
    throw new ApiError(body.error ?? 'Request failed.', res.status, body.next_minimum_bid);
  }
  return data as T;
}

// --- Public ---
export function fetchItems(): Promise<{ items: AuctionItem[] }> {
  return request('/items');
}

export function fetchItemBids(itemId: string): Promise<{ bids: PublicBid[] }> {
  return request(`/items/${itemId}/bids`);
}

export interface PlaceBidInput {
  item_id: string;
  bidder_name: string;
  bidder_email: string;
  bidder_phone: string;
  amount: number;
}
export function placeBid(input: PlaceBidInput): Promise<{ bid: PublicBid }> {
  return request('/bids', { method: 'POST', body: JSON.stringify(input) });
}

// --- Admin ---
export function adminLogin(
  email: string,
  password: string,
): Promise<{ token: string; email: string }> {
  return request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function adminVerify(): Promise<{ role: string }> {
  return request('/admin/me');
}

export type ItemFormInput = Omit<
  AuctionItem,
  'id' | 'sort_order' | 'current_high_bid' | 'next_minimum_bid' | 'bid_count'
> & { sort_order?: number };

export function adminCreateItem(input: ItemFormInput): Promise<{ item: AuctionItem }> {
  return request('/admin/items', { method: 'POST', body: JSON.stringify(input) });
}
export function adminUpdateItem(
  id: string,
  input: Partial<ItemFormInput>,
): Promise<{ item: AuctionItem }> {
  return request(`/admin/items/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}
export function adminDeleteItem(id: string): Promise<void> {
  return request(`/admin/items/${id}`, { method: 'DELETE' });
}
export function adminFetchResults(): Promise<{ results: AuctionResult[] }> {
  return request('/admin/results');
}
export function adminNotifyWinners(
  pickupInstructions: string,
  itemId?: string,
): Promise<{ notified: number; failures: string[] }> {
  return request('/admin/notify-winners', {
    method: 'POST',
    body: JSON.stringify({
      pickup_instructions: pickupInstructions,
      ...(itemId ? { item_id: itemId } : {}),
    }),
  });
}

export function adminExportWinners(): Promise<{ exported: number }> {
  return request('/admin/export-winners', { method: 'POST' });
}
