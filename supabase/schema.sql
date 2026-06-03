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
