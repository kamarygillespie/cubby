# Tech Stack

Every choice below optimizes for: **scalability without over-engineering, low operational overhead for a solo (initially) maintainer, and a genuinely good developer experience with Claude Code.**

## Frontend

| Choice                                         | Why                                                                                                                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js (App Router) + TypeScript**          | One codebase serves the mobile PWA and the desktop browser experience. Server components keep data-fetching close to the DB without a separate API layer for most reads. Huge ecosystem, first-class Vercel support. |
| **Tailwind CSS**                               | Fast, consistent styling without hand-rolled CSS sprawl. Pairs naturally with a minimal, Notion-like aesthetic.                                                                                                      |
| **shadcn/ui**                                  | Accessible, unstyled-by-default components you own the code for (not a black-box library) — easy to make feel bespoke rather than templated.                                                                         |
| **PWA (next-pwa / manifest + service worker)** | Installable on iOS/Android home screens and desktop, offline-friendly for viewing cached data, zero App Store review. Ships in V1; native app is a later, validated decision (see `FEATURES.md`).                    |

## Backend & Data

| Choice                       | Why                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Supabase (Postgres)**      | Relational DB fits the category → item type → item hierarchy and aggregation queries (totals by category, by month, etc.) far better than a document store. Supabase bundles Auth, file Storage, and Row Level Security on top of vanilla Postgres — huge amount of infra for very little setup. |
| **Row Level Security (RLS)** | Multi-tenancy enforced at the database layer, not just in application code. A bug in a Next.js route can't leak another user's data if RLS is correctly configured.                                                                                                                              |
| **Supabase Storage**         | Item images and (later) closet photos. Simple bucket + CDN, no separate image service needed for V1.                                                                                                                                                                                             |
| **Supabase Edge Functions**  | Server-side link autofill (fetch + parse Open Graph/schema.org metadata) and, later, scheduled sale-price re-checks.                                                                                                                                                                             |

## Hosting & Infra

| Choice             | Why                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Vercel**         | Native Next.js support, preview deployments per pull request, painless scaling, generous free tier. |
| **Supabase Cloud** | Managed Postgres, auth, storage — no server ops.                                                    |
| **GitHub**         | Source control + Actions for CI.                                                                    |

## Testing

| Choice         | Why                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vitest**     | Fast, TypeScript-native, minimal config, great for unit/integration tests on business logic (price math, taxonomy mapping, wishlist distribution).    |
| **Playwright** | Real-browser end-to-end tests for the handful of flows that truly matter (sign up, add item, share list, mark purchased). See `TESTING.md` for scope. |

## Quality & Observability

| Choice                  | Why                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **ESLint + Prettier**   | Consistent code style, catches bugs early.                                              |
| **Husky + lint-staged** | Pre-commit hooks so bad code never reaches CI in the first place.                       |
| **Sentry**              | Error monitoring from day one — cheap now, expensive to retrofit once real users exist. |

## Project Management

| Choice                         | Why                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Linear (via MCP connector)** | Lightweight, fast issue tracker. Connected so Claude can create/update tickets directly at the start of each work week (see `ROADMAP.md`). |

## Later / Not Yet Decided

- **Native mobile app:** React Native/Expo, once there's real usage data suggesting it's worth the investment (V2+, see `FEATURES.md`).
- **Desktop app:** Tauri, if a true desktop app (beyond the browser) is ever wanted — lighter than Electron, reuses the same web codebase.
- **Payments/billing:** Not needed until there's a monetization decision; Stripe is the default choice when that day comes.

## Explicitly Rejected (and why)

- **Firebase/Firestore:** Document model fights the relational, aggregation-heavy nature of this data (totals by category/type/month). Postgres is a better fit.
- **Electron for V1:** Heavier than needed when a PWA covers "installable app" for a fraction of the effort.
- **Custom Express/Node backend:** Next.js API routes + Supabase cover V1's needs without maintaining a second deployable service.
