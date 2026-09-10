# Features — Versioned Roadmap

Scope is deliberately tight for V1 so Oct 10 is achievable, with everything else queued up rather than dropped.

## V1 — Launch Target: Oct 10, 2026

**Goal:** fully usable, end-to-end, for a single real user (you), on real multi-tenant infrastructure.

### Core data & item management

- Full item schema: title, image, link, price, interest level (1–5 stars), purchased (+ auto purchased date), gifted, notes, store/brand, item type, category (auto-derived from item type)
- Add item via pasted link → server-side autofill (title/image/price) with full manual edit + image replacement
- Add/edit item manually (no link required)
- Default system taxonomy for Category and Item Type, seeded on signup
- Users can add their own custom Item Types (auto-mapped to a Category) and, if needed, custom Categories

### Views & organization

- All-items view
- Group by Category (count + total price per category)
- Group by Item Type (count + total price per item type)
- Purchased section (items move here automatically when marked purchased)
- Gifted section (items move here automatically when marked gifted)
- Totals: total spent, total wishlist value ("just for fun" grand total), breakdown by category/item type

### Filtering & sorting

- Filter by category, item type
- Sort by interest level (high→low) and price (high→low / low→high), globally or within a filtered view
- Filter to on-sale items

### Sale detection (V1 scope)

- Sale price + discount % captured at add-time or on manual refresh
- Visual "on sale" indicator

### Wishlist sharing

- Multi-select items → add to one or more named wishlists
- Public, no-login share link per wishlist
- Clean, shareable export view (readable on any device, no account needed to view)
- UI surfaces which wishlist(s) an item is already on, to avoid accidentally duplicating an item across two people's lists

### Platform

- Responsive web app
- Installable PWA (mobile + desktop)
- Light/dark/"in-between" theme (see Open Questions)

## V1.5 — Post-Launch Hardening (no fixed date)

- Scheduled sale-price re-checks (not just at add-time)
- Admin/taxonomy management UI polish (bulk edit, merge duplicate item types)
- Performance pass on large wishlists (100+ items)
- Public launch readiness (onboarding flow, empty states, error states)

## V2 — Expansion

- **Closet view:** purchased items automatically appear in a closet gallery; ability to add standalone closet photos and replace item images from here
- **Outfit planning:** create outfit "boards" from closet items, or upload outfit photos to save
- **Favorite stores:** mark favorite stores/brands, track when they're running a sale
- **Gift card recommendations:** group wishlist items by store/brand, ranked by relevance (most items from that store first)
- **Native mobile app:** React Native, once usage justifies the investment

## V3 — Intelligence Layer

- Item recommendations based on interest level, category affinity, and purchase history (approach TBD — likely starts simple: "more like this item type/store" before anything ML-driven)
- Even-price-distribution wishlist generator: select items, choose N target wishlists, and auto-distribute items so each list ends up with a comparable total price (round-robin by sorted price)

## V4 — Notifications & Deeper Analytics

- App and email notifications (price drops on wishlist items, favorite-store sales)
- Spending breakdown by month, using `purchased_date` already captured since V1

## Explicitly Out of Scope (for now)

- Payments/monetization — revisit once there's a public-launch plan
- Social features (following other users' public wishlists, etc.)

## Open Questions to Revisit

- Final app name/branding (see `README.md`)
- Exact "in-between" theme treatment beyond light/dark
- Whether V3 recommendations need any external data source or stay purely first-party
