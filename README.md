# Ashleigh's Silent Auction Platform

A mobile-first, accessible single-page app for running a silent auction
fundraiser. Bidders browse items, see anonymised competing bids (initials +
amount only), and place bids with their contact details. A single admin can log
in via the red circle in the nav bar to manage items and notify winners.

**Stack:** React + TypeScript (strict) · Vite · Express · Node · Supabase (Postgres)

---

## Features

- 📱 **Mobile-first** responsive layout, white/light hopeful palette.
- ♿ **Accessible** — skip link, ARIA labels, labelled dialogs with focus trap &
  restore, visible keyboard focus, reduced-motion support, 44px tap targets.
- 🖼️ **Hero + photo gallery** of Ashleigh with a personal blurb (drop in photos
  later — placeholders show until then).
- 🧾 **22 auction items** seeded from the provided PDF, each with its own value,
  minimum bid, increment, optional quantity (multiples) and winning threshold.
- 💸 **Bidding** requires full name, email and phone. Amounts are validated
  server-side against the increment grid and current high bid.
- 👀 **Anonymised leaderboard** — other bidders see only initials + amount, to
  entice higher bids.
- 🔢 **Multiples + threshold** — e.g. 3 identical items: the top 3 bidders who
  exceed the threshold each win one.
- 🔴 **Admin** (red circle in nav) — single account (`omaurbliss@gmail.com`)
  with full CRUD over items, a computed winners view, and one-click winner
  emails with prize-pickup instructions.

---

## Project structure

```
.
├── client/            React + TS + Vite front-end
│   ├── public/        Drop hero.jpg + gallery/photo1..5.jpg here
│   └── src/
│       ├── components/  Nav, Hero, Gallery, ItemCard, BidModal, Admin*…
│       ├── content.ts   ← edit the blurb & photo paths here
│       ├── api.ts        Typed API client
│       └── App.tsx
├── server/            Express + TS API
│   └── src/
│       ├── routes/      items (public), bids (public), admin (CRUD)
│       ├── services/    bidLogic.ts (pure rules), email.ts
│       ├── middleware/  auth.ts (JWT admin guard)
│       └── data/        seedItems.ts (the PDF catalogue)
└── supabase/
    └── schema.sql     Tables, indexes, RLS
```

---

## Setup

### 1. Create a Supabase project & schema
In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).

### 2. Configure the server
```bash
cp server/.env.example server/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a strong JWT_SECRET.
# ADMIN_EMAIL / ADMIN_PASSWORD default to the provided credentials.
```

### 3. Install & seed
```bash
npm install
npm run seed          # loads the 22 auction items
```

### 4. Run in development
```bash
npm run dev           # API on :4000, client on :5173 (proxies /api → :4000)
```
Open http://localhost:5173.

### 5. Production build
```bash
npm run build         # builds server (dist/) and client (client/dist/)
npm run start         # serves the API; deploy client/dist as static files
```

---

## Admin

Click the **red circle** in the nav bar and sign in with the admin credentials
from your `.env`. From the dashboard you can:

- **Items** — create, edit and delete auction items (all fields, including
  quantity and threshold for multiples).
- **Winners** — view computed winners (honours multiples + thresholds) with
  full bidder contact info, and email winners prize-pickup instructions.

### Email delivery
Winner emails use a pluggable transport (`server/src/services/email.ts`):
- No config → emails are **logged to the server console** (safe default).
- Set `RESEND_API_KEY` (+ optional `EMAIL_FROM`) to send real emails via Resend.

---

## Adding photos later

Place files in `client/public/` and reference them in `client/src/content.ts`:
- `client/public/hero.jpg` — top portrait
- `client/public/gallery/photo1.jpg` … `photo5.jpg` — gallery

See [`client/public/gallery/README.md`](client/public/gallery/README.md).

---

## How bidding rules work

Implemented as pure functions in `server/src/services/bidLogic.ts`:

- **First bid** (or any open unit on a multiple) starts at `minimum_bid`.
- **Single item:** the next bid must beat the current leader by one `increment`.
- **Multiple (quantity N):** once all N units are contested, a new bid must beat
  the lowest standing winner by one increment to displace it.
- **Winners:** the top `quantity` bids that also meet `threshold` (when set).
  Example from the brief — 3 bikes, $70 threshold: bids of $80/$90/$100 all win;
  a 4th-place $60 does not.

All amounts must sit on the increment grid measured from the minimum bid.

> Defaults: where the source PDF omitted a minimum bid or increment, a sensible
> default was filled in (flagged in `seedItems.ts`); adjust any of it from the
> admin dashboard.
