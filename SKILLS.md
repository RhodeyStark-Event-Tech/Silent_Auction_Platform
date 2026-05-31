# SKILLS.md

Task recipes for working on the Silent Auction Platform. Each skill is a
focused workflow: when to use it, which files to touch, and how to verify.
Read [CLAUDE.md](CLAUDE.md) first for architecture and conventions.

---

## Skill: Add or change an auction-item field

**When:** the item shape needs a new attribute (e.g. a category, an end time).

**Touch, in order:**
1. `supabase/schema.sql` — add the column (with sensible default/check) to
   `public.items`. Apply it to the live DB via the Supabase SQL editor.
2. `server/src/types.ts` — add the field to `AuctionItem` (and `SeedItem`
   follows automatically).
3. `server/src/routes/admin.ts` — extend `itemSchema` (Zod) so create/update
   accept it; update `normalizeItem` if it needs coercion.
4. `server/src/data/seedItems.ts` — populate the field for the 22 seed items.
5. `client/src/types.ts` — mirror the field on the client `AuctionItem`.
6. `client/src/components/AdminItemForm.tsx` — add the form control.
7. Display it where relevant (e.g. `ItemCard.tsx`).

**Verify:** `npm run typecheck`. Both `types.ts` files must agree.

---

## Skill: Change a bidding rule

**When:** the minimum-bid logic, increment grid, tie-breaking, or winner
selection needs to change.

**Touch:** `server/src/services/bidLogic.ts` — and **only** here for the rules.
Routes call these pure functions; don't inline rule logic into routes.

- Acceptance of a bid → `nextMinimumBid` + `validateBidAmount`.
- Who wins → `determineWinners`.
- These two must stay consistent (what we accept vs. who we crown).

**Verify:** reason through the worked examples in CLAUDE.md (single item;
3-unit multiple with a threshold). `npm run typecheck`. Functions are pure, so
you can exercise them with a throwaway `tsx` script if needed.

---

## Skill: Add a new API endpoint

**When:** the client needs data or an action not yet exposed.

**Steps:**
1. Pick the router: `routes/items.ts` or `routes/bids.ts` (public) vs.
   `routes/admin.ts` (behind `requireAdmin`). Decide the PII boundary first —
   public responses must never include bidder name/email/phone.
2. Define a **Zod** schema and `safeParse` the body; return
   `{ error: parsed.error.issues[0]?.message }` with the right status on failure.
3. Use the shared `supabase` client; handle Supabase `error` explicitly
   (`500` with a friendly message).
4. For derived auction state, call `bidLogic.ts` helpers — don't recompute.
5. Wire it in `server/src/index.ts` if it's a new router/path. Remember
   rate-limiting middleware for write-heavy or auth endpoints.
6. Add a typed function in `client/src/api.ts` to call it.

**Verify:** `npm run typecheck`; hit it with `curl` against `npm run dev`
(e.g. `curl localhost:4000/api/health`).

---

## Skill: Work on the admin dashboard

**When:** changing CRUD, the winners view, or winner notifications.

**Files:** `client/src/components/AdminDashboard.tsx`,
`AdminItemForm.tsx`, `AdminLogin.tsx`, plus admin functions in `api.ts`.
Server side: `routes/admin.ts`.

**Auth flow:** login → `POST /api/admin/login` returns a JWT → stored in
`localStorage` (`auction_admin_token`) → sent as `Bearer` on every request →
`App.tsx` restores the session on load via `GET /api/admin/me`.

**Verify:** log in with the credentials from `server/.env` via the red circle
in the nav; exercise create/edit/delete and the winners view.

---

## Skill: Wire up real winner emails

**When:** moving from console-logged emails to real delivery.

**Files:** `server/src/services/email.ts`. The default transport logs to the
console; setting `RESEND_API_KEY` (+ optional `EMAIL_FROM`) sends via Resend's
HTTP API. To use a different provider, replace the body of `deliver()` only —
`sendWinnerEmail` and all callers stay unchanged.

**Verify:** without a key, trigger `POST /api/admin/notify-winners` and confirm
the `[email:dev]` log lines. With a key, send a test to a real inbox.

---

## Skill: Reset / re-seed the catalogue

**When:** restoring the 22-item catalogue or editing seed data.

**Steps:** edit `server/src/data/seedItems.ts`, then `npm run seed`.

⚠️ **Destructive:** `scripts/seed.ts` deletes all existing items first, and
bids cascade-delete with them. Never run against data you want to keep.

---

## Skill: Add hero / gallery photos

**When:** dropping in real photos of Ashleigh.

**Steps:** place files under `client/public/` (`hero.jpg`,
`gallery/photo1.jpg`…`photo5.jpg`) and reference them in
`client/src/content.ts`. Placeholders render until the files exist.
See `client/public/gallery/README.md`.

---

## Skill: Build & deploy

**Steps:**
1. `npm run build` → `server/dist/` + `client/dist/`.
2. `npm run start` serves the API; deploy `client/dist/` as static files.
3. Set production env on the server: real `JWT_SECRET`, `ADMIN_PASSWORD`,
   Supabase keys, and `CLIENT_ORIGIN` (comma-separated allowed origins for CORS).

**Verify:** `npm run typecheck` first; confirm the server boots (config
validation throws on missing env), then `GET /api/health`.

---

## Guardrails (apply to every skill)

- **Never** return bidder PII from a public endpoint — only the `PublicBid`
  shape (initials + amount).
- **Never** expose the Supabase service-role key or call Supabase from the
  client.
- **Never** commit or print `server/.env`. All passwords/keys/secrets live
  **only** in `.env` — committed files (incl. `.env.example`) use placeholders.
- **Always** keep `.env` and `.DS_Store` in `.gitignore`.
- Keep imports ESM-style with `.js` extensions in server source.
- Validate all input with Zod at the route boundary.
- There is no test suite — `npm run typecheck` is the primary automated check.
