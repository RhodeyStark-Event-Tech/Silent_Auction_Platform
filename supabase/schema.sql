-- Silent Auction Platform — database schema
-- Run this in the Supabase SQL editor (or `supabase db` tooling) before seeding.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Auction items
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null default '',
  value            numeric not null check (value >= 0),
  minimum_bid      numeric not null check (minimum_bid >= 0),
  increment        numeric not null check (increment > 0),
  quantity         integer not null default 1 check (quantity >= 1),
  threshold        numeric check (threshold >= 0),
  image_url        text,
  contact          text,
  product_at_event boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists items_sort_order_idx on public.items (sort_order);

-- ---------------------------------------------------------------------------
-- Bids
-- ---------------------------------------------------------------------------
create table if not exists public.bids (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items (id) on delete cascade,
  bidder_name  text not null,
  bidder_email text not null,
  bidder_phone text not null,
  amount       numeric not null check (amount > 0),
  created_at   timestamptz not null default now()
);

create index if not exists bids_item_id_idx on public.bids (item_id);
create index if not exists bids_item_amount_idx on public.bids (item_id, amount desc);

-- ---------------------------------------------------------------------------
-- Seed data — the 22-item PDF catalogue (mirrors server/src/data/seedItems.ts)
--
-- Guarded so it only runs when the items table is EMPTY. This makes the whole
-- script safe to re-run: it never duplicates rows and never deletes existing
-- bids (unlike `npm run seed`, which clears items first). To re-seed from
-- scratch, `truncate public.items cascade;` first, then re-run this file.
-- Where the source PDF omitted a minimum bid / increment, a sensible default
-- was used; adjust any of it later from the admin dashboard.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.items) then
    insert into public.items
      (title, description, value, minimum_bid, increment, quantity, threshold, image_url, contact, product_at_event, sort_order)
    values
      ('4 MN Twins Baseball Tickets (Section 112)', 'Four Minnesota Twins tickets in section 112 for the game against the Atlanta Braves on Monday 8/17/26.', 260, 100, 5, 1, null, null, 'Eric Reimer (612) 730-4631', false, 1),
      ('2 MN Wild Hockey Tickets + Club Passes', 'Two Minnesota Wild tickets (Section 121, Row 20, seats 1 & 2) including Custom-One Club Passes. Weekend game, date TBD for the 2026-2027 season.', 550, 220, 5, 1, null, null, 'Gary Fetzer (612) 715-5535', false, 2),
      ('2 MN Lynx Basketball Tickets (Section 109)', 'Two Minnesota Lynx tickets in section 109. Game is Sunday 6/21 @ 5pm versus the Mystics.', 400, 200, 5, 1, null, null, 'Cody Cropper — codycropper1@gmail.com', false, 3),
      ('Round of Golf w/ Caddies for 3 — Hazeltine National', 'One round of golf with caddies for 3 people at Hazeltine National Golf Course.', 1500, 650, 10, 1, null, null, 'Ryan Dahl (952) 484-2822', false, 4),
      ('Hosted Threesome of Golf — Minneapolis Golf Club', 'Hosted threesome of golf (including caddies) at Minneapolis Golf Club.', 1000, 450, 10, 1, null, null, 'Rob Wagner (651) 331-6846 — Rob.wagner@thrivent.com', false, 5),
      ('Round of Golf for 4 — Bent Creek Golf Club', 'One round of golf for 4 people (including golf carts) at Bent Creek Golf Club. Expires 10/31/27.', 500, 250, 10, 1, null, null, 'Steve Broyer (612) 770-4645', false, 6),
      ('Signed MN Wild Ryan Suter Jersey', 'Signed Minnesota Wild Ryan Suter jersey.', 250, 120, 5, 1, null, null, null, false, 7),
      ('MN United "Michael Boxall" Team-Signed Jersey', 'Minnesota United soccer "Michael Boxall" jersey, signed by the entire 2026 team.', 400, 200, 5, 1, null, null, null, true, 8),
      ('Signed Seattle Kraken Fred Gaudreau Jersey', 'Seattle Kraken hockey jersey signed by Fred Gaudreau.', 250, 120, 5, 1, null, null, null, false, 9),
      ('Original Mandala Artwork by Jennifer Schauer (24")', 'First piece of original mandala artwork by Jennifer Schauer. Size: 24".', 150, 70, 5, 1, null, null, null, true, 10),
      ('Original Mandala Artwork by Jennifer Schauer (30")', 'Second piece of original mandala artwork by Jennifer Schauer. Size: 30".', 200, 90, 5, 1, null, null, null, true, 11),
      ('Botox Package — LifeSpa Medi (Eden Prairie Athletic)', 'Up to 64 units of Botox with Stephanie Astor, APRN, FNP-C, CANS at the LifeSpa Medi (Eden Prairie Athletic).', 900, 350, 10, 1, null, null, 'Stephanie Astor — stephanieastoraesthetics@gmail.com', false, 12),
      ('3X3 Beauty Skincare Package', 'Skincare package from 3X3 Beauty (owned by Kim Ross): Neck Firming & Hydration Creme, Eye’M Beautiful Eye Creme, Face & Neck Repair Serum, Nutrient Rich Hair & Skin Oil, Lip Repair with SPF 15, Nutrient Lip Repair Oil, and Nature’s Lip Scrub.', 165, 80, 5, 1, null, null, 'Kim Ross', true, 13),
      ('AFL Skincare — Diamond Glow Facial + Sunscreen', 'AFL Skincare package: gift card for a Diamond Glow Facial ($200) plus Total Protection Glow sunscreen by Colorescience ($52).', 252, 160, 5, 1, null, null, 'Ann Larson — Aflskincare@comcast.net', true, 14),
      ('The Wine Company — Wine Basket', 'Wine basket from The Wine Company filled with 2 bottles of wine, a wine bottle opener, and two wine glasses.', 75, 40, 5, 1, null, null, 'Patty Douglas (wine rep)', true, 15),
      ('The Wine Company — Cocktail Basket', 'Cocktail basket from The Wine Company: 1 bottle of whiskey, 1 bottle of Amaro, and 4 rocks glasses.', 100, 50, 5, 1, null, null, 'Patty Douglas (wine rep)', true, 16),
      ('Dairy Queen for a Year!', '12 boxes total (6 Dilly Bars each box) — Dairy Queen for a year!', 170, 85, 5, 1, null, null, 'Heather Peters — Heather.peters@idq.com', false, 17),
      ('Guided Fly Fishing Trip for 2 — Rush River', 'Full-day guided fly fishing trip for 2 people on the Rush River. Includes all fishing gear, a shore lunch, and transportation from the Twin Cities.', 600, 300, 5, 1, null, null, 'David Healy — Daveh@classic-company.com', false, 18),
      ('2 Pieces of Jewelry from Diamonds Direct', 'Two pieces of jewelry from Diamonds Direct: a 22" men’s or women’s classic mariner link steel chain, and a 7" tennis bracelet with round white cubic zirconia stones (steel links).', 275, 130, 5, 1, null, null, 'Maria Bronce (952) 232-8660', false, 19),
      ('Restaurant Gift Card Bundle', 'Bundle of restaurant gift cards: Ciao Bella, Vagabondo, CoV, and Maynard’s.', 300, 150, 5, 1, null, null, null, true, 20),
      ('Life Time Eden Prairie — Private Training (2 available)', 'Two identical donated packages, each: 1 book / 2 private training sessions (your choice of dynamic personal training, pilates, or dynamic stretch) at Life Time Eden Prairie. The top 2 bidders above the threshold each win a package.', 350, 200, 5, 2, 250, null, 'Joe Meier — jmeier@lt.life', false, 21),
      ('Hazeltine National Golf Club Swag Package', 'Hazeltine National Golf Club swag package: 1 golf bag, 1 driver head cover, and 2 baseball hats.', 500, 250, 10, 1, null, null, null, true, 22);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security & access lockdown
--
-- All access is mediated by the Express API using the service-role key, which
-- bypasses both RLS and these grants. The public never queries Supabase
-- directly — it only calls the API, which anonymises bids and hides donor
-- contact info. So the anon/authenticated roles should have ZERO access.
--
-- Defense in depth, two independent locks:
--   1. Revoke table privileges from the public roles (grant-level lock).
--   2. Enable + FORCE row level security with NO policies (row-level lock).
-- Intentionally NO permissive policies exist: adding one would expose bidder
-- PII / donor contacts to the public anon key. Do not add policies here.
-- ---------------------------------------------------------------------------
revoke all on public.items from anon, authenticated;
revoke all on public.bids  from anon, authenticated;

alter table public.items enable row level security;
alter table public.bids  enable row level security;

-- FORCE so RLS applies even to the table owner; service-role still bypasses.
alter table public.items force row level security;
alter table public.bids  force row level security;
