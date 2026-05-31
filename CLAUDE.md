# CLAUDE.md

Guidance for Claude Code when working in this repository.

## How I like to work

These preferences apply to **every** task in this repo. Follow them by default.

### 1. Give detailed explanations

Don't just hand me a result — explain it. For any change, answer, or
recommendation, walk me through:

- **What** you did or are proposing, in plain language.
- **Why** — the reasoning, trade-offs, and any alternatives you considered and
  rejected.
- **How it works** — enough detail that I understand the mechanism, not just
  the outcome. When you touch code, explain what the code does and how it fits
  the rest of the system.
- **What to watch out for** — side effects, assumptions, follow-ups, or risks.

Assume I want to learn from the change, not just receive it. More context is
better than less. Use concrete file/line references so I can follow along.

### 2. Step-by-step instructions for anything outside your scope

Some work can't be done from inside this tool — creating cloud accounts,
clicking through dashboards, obtaining API keys, configuring DNS, running
interactive installers, anything needing my credentials or a browser. Whenever a
task depends on something like that, **stop and write me explicit, numbered,
step-by-step instructions** so I can do it myself. For each handoff:

- Number every step; assume no prior familiarity with the service.
- Say exactly where to click / what to type / which menu to open (e.g.
  "Supabase → Project Settings → API → copy the `service_role` key").
- Note what value I should end up with and **exactly where to paste it** (e.g.
  "paste it into `server/.env` as `SUPABASE_SERVICE_ROLE_KEY=...`").
- Call out anything destructive, paid, or security-sensitive before the step.
- After the manual steps, tell me how to verify it worked and what to tell you
  so you can continue.

Examples of "outside your scope" here: creating the Supabase project and running
`schema.sql` in its SQL editor, getting the Supabase URL + service-role key,
obtaining a `RESEND_API_KEY`, and any production deploy/hosting setup.

### 3. Always explain and ask permission before making changes

Before editing files, running anything that modifies state, or taking any
non-trivial action:

1. **Explain** what you intend to do and why.
2. **Ask for my permission** and wait for me to agree.
3. Only then make the change.

This applies to code edits, deletions, installs, schema changes, git
operations, re-seeding the database (destructive!), and anything outward-facing.
Read-only investigation (reading files, searching, typechecking) doesn't need
permission — but the moment you're about to *change* something, pause and check
with me first. When in doubt, ask.

## What this is

A mobile-first, accessible single-page app for running a silent auction
fundraiser ("Ashleigh's Silent Auction Platform"). Bidders browse items, see
anonymised competing bids (initials + amount only), and place bids with their
contact details. A single admin manages items and notifies winners.

**Stack:** React 18 + TypeScript (strict) · Vite · Express 4 · Node (ESM) ·
Supabase (Postgres) · Zod · JWT.

## Repository layout

This is an npm **workspaces** monorepo. The real project root is this directory
(`Silent_Auction_Platform/`), with two workspaces:

```
.
├── client/              React + TS + Vite front-end (port 5173)
│   ├── public/          hero.jpg + gallery/photo1..5.jpg (placeholders until added)
│   └── src/
│       ├── components/  Nav, Hero, Gallery, ItemCard, BidModal, BidList,
│       │                Modal, AdminLogin, AdminDashboard, AdminItemForm
│       ├── content.ts   Editable blurb + photo paths
│       ├── api.ts        Typed API client (fetch wrapper, token storage)
│       ├── types.ts      Client-side domain types
│       └── App.tsx       Top-level view switch (public ↔ admin)
├── server/              Express + TS API (port 4000)
│   └── src/
│       ├── index.ts      App wiring, CORS, rate limits, error handlers
│       ├── config.ts     Validated env config (throws on boot if missing)
│       ├── supabase.ts   Service-role Supabase client (bypasses RLS)
│       ├── types.ts      Shared domain types (AuctionItem, Bid, PublicBid)
│       ├── routes/       items (public), bids (public), admin (CRUD + winners)
│       ├── services/     bidLogic.ts (pure rules), email.ts (pluggable delivery)
│       ├── middleware/   auth.ts (JWT admin guard, constant-time creds)
│       ├── data/         seedItems.ts (the 22-item PDF catalogue)
│       └── scripts/      seed.ts (clears + reloads items)
└── supabase/
    └── schema.sql        Tables, indexes, RLS (no public policies)
```

## Commands

Run all commands from this directory (the workspace root).

| Command | What it does |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | API on :4000 + client on :5173 concurrently (client proxies `/api` → :4000) |
| `npm run build` | Build server (`server/dist/`) then client (`client/dist/`) |
| `npm run start` | Serve the built API (`node dist/index.js`) |
| `npm run seed` | Load the 22 auction items (clears existing items first) |
| `npm run typecheck` | Typecheck server + client |
| `npm run lint` | ESLint the client |

There is **no test runner configured** — do not assume `npm test` exists.
Verify changes with `npm run typecheck` and, for logic, by reasoning about the
pure functions in `bidLogic.ts`.

## Setup prerequisites

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. `cp server/.env.example server/.env` and fill in `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ADMIN_PASSWORD`.
3. `npm install && npm run seed`, then `npm run dev`.

`server/config.ts` validates required env vars at boot and throws early if any
are missing, so a server that starts is correctly configured.

## Architecture & conventions

- **ESM throughout.** Server is `"type": "module"`; relative imports must use
  the `.js` extension even for `.ts` source (e.g. `import { config } from
  './config.js'`). Match this when adding files.
- **Strict TypeScript.** `tsconfig` enables `strict`, `noUnusedLocals/Parameters`,
  `noImplicitReturns`, `exactOptionalPropertyTypes`. Keep code clean of unused
  symbols or the build fails.
- **Validation at the edge.** Every route parses its body with a **Zod** schema
  (`safeParse`) and returns `{ error }` with the first issue message on failure.
  Add/extend a Zod schema for any new input.
- **Pure domain logic.** Auction rules live in `services/bidLogic.ts` as pure,
  side-effect-free functions (`toInitials`, `rankBids`, `nextMinimumBid`,
  `validateBidAmount`, `determineWinners`). Keep new rules here and keep them
  pure — routes should call them, not reimplement them.
- **PII boundary (important).** Bidder name/email/phone are PII. Public
  endpoints must only ever return the `PublicBid` shape (initials + amount).
  Full `Bid` records (with contact info) are returned **only** through
  `requireAdmin`-guarded admin routes. When touching anything that returns
  bids, confirm which side of this boundary you are on.
- **Supabase access is server-only.** The server uses the **service-role key**,
  which bypasses Row Level Security. The schema enables RLS with **no
  permissive policies**, so the anon key cannot read PII even if leaked. Never
  expose the service-role key or call Supabase from the client.
- **Auth.** Single admin account (email + password in env). `auth.ts` compares
  credentials in constant time (`timingSafeEqual`) and issues a JWT
  (`role: 'admin'`, 8h default). `requireAdmin` guards all `/api/admin/*` routes
  except `/login`. The client stores the token in `localStorage` and sends it as
  a `Bearer` header (`client/src/api.ts`).
- **Rate limiting.** `/api/bids` is limited to 30 writes/min; `/api/admin/login`
  to 10 attempts/15 min (`server/src/index.ts`).
- **Money is plain `numeric`/`number`** (whole dollars). Bids must sit on the
  increment grid measured from `minimum_bid` — see `validateBidAmount`.

## Bidding rules (the core domain)

Implemented in `server/src/services/bidLogic.ts`:

- **First bid** (or any open unit on a multiple) starts at `minimum_bid`.
- **Single item:** the next bid must beat the current leader by one `increment`.
- **Multiple (`quantity` N):** once all N units are contested, a new bid must
  beat the current lowest standing winner by one increment to displace it.
- **Winners:** the top `quantity` bids that also meet `threshold` (when set).
  Ranking is amount-desc, earliest-bid breaks ties.
- All amounts must be integer multiples of `increment` above `minimum_bid`.

When changing these rules, update both `nextMinimumBid`/`validateBidAmount`
(what's accepted) and `determineWinners` (who wins) together — they must agree.

## API surface

Public (no auth):
- `GET /api/health`
- `GET /api/items` — items + derived state (`current_high_bid`,
  `next_minimum_bid`, `bid_count`), no PII
- `GET /api/items/:id/bids` — anonymised leaderboard (`PublicBid[]`)
- `POST /api/bids` — place a bid (validated server-side; returns `PublicBid`)

Admin (`requireAdmin`, except login):
- `POST /api/admin/login` → `{ token, email }`
- `GET /api/admin/me` — token check
- `POST|PUT|DELETE /api/admin/items[/:id]` — CRUD
- `GET /api/admin/items/:id/bids` — full bids with PII
- `GET /api/admin/results` — computed winners across all items
- `POST /api/admin/notify-winners` — email winners (optionally scoped to one item)

## Email

`server/src/services/email.ts` is a pluggable transport:
- **No `RESEND_API_KEY`** → emails are logged to the server console (safe default).
- **`RESEND_API_KEY` set** (+ optional `EMAIL_FROM`) → sent via Resend's HTTP API
  using `fetch` (no extra dependency).

Swap providers inside `deliver()` without touching callers.

## Gotchas

- The git repo root and the project root differ: the repo lives in this
  `Silent_Auction_Platform/` directory.
- **Secrets policy:** all passwords, keys, and secrets live **only** in `.env`
  files, never in committed source. `.env` and `.DS_Store` must always stay in
  `.gitignore` (they are — `.env`, `server/.env`, `client/.env`, `.DS_Store`).
  `server/.env` is gitignored and holds real secrets — never commit it or echo
  its contents. Committed files like `.env.example` must use placeholders only,
  never real credentials.
- Re-seeding (`npm run seed`) **deletes all existing items** (and bids cascade).
  Don't run it against data you want to keep.
- Client and server each have their own `types.ts`; the client `AuctionItem`
  includes derived fields (`current_high_bid`, etc.) the server's does not.
  Keep them in sync when changing the item shape.
