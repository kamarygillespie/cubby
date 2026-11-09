# Features — Versioned Roadmap

Scope is deliberately tight for V1 so Oct 10 is achievable, with everything else queued up rather than dropped.

## V1 — Launch Target: Oct 10, 2026

**Goal:** fully usable, end-to-end, for a single real user (you), on real multi-tenant infrastructure.

### Core data & item management

- Full item schema: title, image, link, price, interest level (1–5 stars), purchased (+ auto purchased date), gifted, notes, store/brand, item type, category (auto-derived from item type)
- Add item via pasted link → server-side autofill (title/image/price) with full manual edit + image replacement
- Add/edit item manually (no link required). Edit at `/items/<id>/edit` (Edit on each card): all fields, plus replace or remove the image (the old file is deleted from storage). Delete lives on the edit page behind a confirmation that names any wishlists the item will drop off
- Default system taxonomy for Category and Item Type, seeded on signup
- Users can add their own custom Item Types (auto-mapped to a Category) and, if needed, custom Categories: "+ New type" on the add/edit form (optionally creating a new category in the same step), and a **Manage types** page at `/types` to add, rename and delete your own. Built-ins are read-only. Names are unique per user ignoring case, including against built-ins. A type that items still use, or a category that still has types, can't be deleted (with a message saying why)

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

- Sale price + discount % captured at add-time or on manual refresh: **Check price** on any wishlist card with a link, and **Check all prices** on the Wishlist tab (checks what the tab is showing, one item at a time, with a summary like "2 now on sale, 5 unchanged")
- Visual "on sale" indicator

### Wishlist sharing

- Multi-select items → add to one or more named wishlists (Wishlist tab only — purchased/gifted items aren't offered; a new list can be created inline from the picker, and re-adding an item already on a list is a silent no-op)
- Public, no-login share link per wishlist (`/share/<token>`, copied from the list page). Purchased/gifted items are hidden from it so givers don't duplicate a gift; the owner's notes are shown (useful for sizes/colors)
- Clean, shareable export view (readable on any device, no account needed to view)
- UI surfaces which wishlist(s) an item is already on, to avoid accidentally duplicating an item across two people's lists (an "On: …" chip row on each item card, plus "N already on it" in the add-to-wishlist picker)
- Wishlist management at `/wishlists`: create, rename, delete (items stay in your wishlist; only the list and its share link go), view a list's items with count + total, remove an item from a list. A list keeps items after they're marked purchased/gifted and labels them, so a gift-giver's list reflects what's been bought

### Platform

- Responsive web app
- Installable PWA (mobile + desktop)
- Theme picker: Light / Dim / Dark / System. "Dim" is the in-between option — a soft slate palette with lower contrast than dark; System (the default) follows the OS setting. Saved per device, not per account (see `ARCHITECTURE.md` → Theming)

## V1.5 — Post-Launch Hardening (no fixed date)

- Scheduled sale-price re-checks (not just at add-time): **built (KAM-43)**. Every active wishlist item with a link is re-checked about once a day automatically; cards show "Checked 3h ago"; every check is kept as price history
- Admin/taxonomy management UI polish (bulk edit, merge duplicate item types): **built (KAM-44)**. **Change type** in Select mode moves all selected items to one type; **Merge** on Manage types folds one of your types into another (built-in or yours), moving its items and deleting the duplicate atomically
- Performance pass on large wishlists (100+ items): **done (KAM-45)**. Lists render 50 cards at a time with "Show more" (counts, group totals, filters and Check all prices still cover every item); off-screen cards skip layout; /wishlists loads only prices
- Public launch readiness (onboarding flow, empty states, error states)

## V2 — Expansion

- **Closet view:** purchased items automatically appear in a closet gallery; ability to add standalone closet photos and replace item images from here
- **Outfit planning:** create outfit "boards" from closet items, or upload outfit photos to save
- **Favorite stores:** mark favorite stores/brands, track when they're running a sale
- **Gift card recommendations:** group wishlist items by store/brand, ranked by relevance (most items from that store first)
- **Mobile app = the installable PWA** (decided Nov 8, 2026): no separate React Native codebase. The PWA gets a native feel instead: bottom tab bar on phones, offline shell, camera upload, share-to-Cubby (Android), install prompt (KAM-51). Revisit a true native app only if usage demands it

## V3 — Intelligence Layer

- Item recommendations based on interest level, category affinity, and purchase history (approach TBD — likely starts simple: "more like this item type/store" before anything ML-driven)
- Even-price-distribution wishlist generator: select items, choose N target wishlists, and auto-distribute items so each list ends up with a comparable total price (round-robin by sorted price)

## V4 — Notifications & Deeper Analytics

- Notifications for price drops on wishlist items and favorite-store sales, delivered as **phone push via the installed PWA** plus an in-app notifications list (decided Nov 8, 2026; no email for now) (KAM-54)
- Spending breakdown by month, using `purchased_date` already captured since V1

## Explicitly Out of Scope (for now)

- Payments/monetization — revisit once there's a public-launch plan
- Social features (following other users' public wishlists, etc.)

## Open Questions to Revisit

- Final app name/branding (see `README.md`)
- ~~Whether V3 recommendations need any external data source or stay purely first-party~~ → **first-party only** (decided Nov 8, 2026, KAM-52)
