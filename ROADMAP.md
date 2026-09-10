# Roadmap — To Oct 10, 2026

Today is Sept 4, 2026 — this is **~5 weeks**, not 8. Scope in `FEATURES.md` V1 is sized to fit that realistically.

**Weekly ritual:** at the start of each week, use Claude (with the Linear connector) to turn that week's section below into Linear tickets — one epic per week, one card per bullet, so the plan and the tracker never drift apart.

## Week 1 — Sep 4 to Sep 10: Foundation

- Initialize Next.js + TypeScript repo, Tailwind + shadcn/ui setup
- Create Supabase project; run schema + seed SQL from `DATABASE.md`
- Wire up Supabase Auth (sign up / log in / log out)
- Deploy skeleton app to Vercel, confirm preview deployments work
- Set up GitHub Actions CI (lint, typecheck, test, build) per `TESTING.md`
- Set up Husky pre-commit hooks, Sentry project
- Connect Linear, create the V1 epic structure

## Week 2 — Sep 11 to Sep 17: Core Item Management

- Item data model wired end-to-end (create/read/update/delete)
- Manual "add item" form with full schema (title, price, interest level, notes, store/brand, item type → derived category, etc.)
- Image upload to Supabase Storage, with replace-image support
- Basic all-items list view
- Unit tests for taxonomy derivation and price/discount math

## Week 3 — Sep 18 to Sep 24: Autofill, Grouping & Filtering

- Link autofill Edge Function (Open Graph/schema.org parsing) + "paste link" add-item flow
- Group-by-Category view (count + total price)
- Group-by-Item-Type view (count + total price)
- Filtering (category, item type, on-sale) and sorting (interest level, price)

## Week 4 — Sep 25 to Oct 1: Purchased/Gifted, Totals, Platform Feel

- Purchased section (auto-move + purchased date, already handled at the DB layer — wire up UI)
- Gifted section (auto-move)
- Totals dashboard: total spent, total wishlist value, breakdown by category/item type
- On-sale indicator in the UI using `sale_price`/`discount_percent`
- PWA manifest + install prompt, test install on mobile + desktop
- Theme (light/dark + the "in-between" middle option)

## Week 5 — Oct 2 to Oct 8: Wishlists & Hardening

- Multi-select items → add to one or more named wishlists
- Wishlist management UI (create, rename, delete, view which items are on which lists — the anti-duplicate-gift safeguard)
- Public, no-login share page for a wishlist
- Critical-path Playwright tests (signup, add item, mark purchased, share list)
- Bug bash + polish pass (empty states, loading states, error states)

## Oct 9–10: Buffer & Launch

- Final QA pass against `FEATURES.md` V1 scope
- Fix anything surfaced in the bug bash
- Production deploy
- **Oct 10: V1 live for personal use**

## After Launch

- Live with it through a real use cycle before deciding what from `FEATURES.md` V1.5/V2 to tackle next
- Revisit the public "invite others" launch timing once V1 has been used for real
