# Testing & CI/CD

Goal: real confidence when shipping changes, without building test infrastructure so heavy it slows down a solo-maintained project.

## Testing Philosophy

- **Test business logic thoroughly.** Anything with real logic — price/discount math, item-type-to-category derivation, purchased-date sync, the wishlist even-distribution algorithm (V3) — gets unit tests. This is cheap to write and catches the bugs that actually matter.
- **Test the critical path end-to-end, not everything end-to-end.** A handful of Playwright tests covering the flows that would be genuinely bad to break: sign up/log in, add an item (manual + via link autofill), mark an item purchased/gifted, create a wishlist and open its public share link. Broad UI coverage isn't worth the maintenance cost at this stage.
- **Don't test the framework.** No tests asserting Next.js routing works, or that Tailwind classes apply — trust the tools.

## Test Layers

| Layer       | Tool                                 | Scope                                                                                                            |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Unit        | Vitest                               | Pure functions: price/discount math, taxonomy mapping, filtering/sorting logic, wishlist distribution algorithm  |
| Integration | Vitest + Supabase local/test project | DB helper functions in `lib/db/` — RLS behaves as expected, triggers fire correctly (e.g. `purchased_date` sync) |
| End-to-end  | Playwright                           | Critical user flows listed above, run against a preview deployment                                               |

## CI Pipeline (GitHub Actions)

**On every pull request:**

1. Install dependencies (cached)
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test` (unit + integration)
5. `npm run build`
6. Vercel automatically creates a preview deployment for the PR

**On merge to `main`:**

1. All of the above
2. `npm run test:e2e` against the fresh preview/production deployment
3. Vercel promotes to production if everything passes
4. Sentry release created and tagged with the commit SHA, so errors map back to the exact deploy that caused them

## Pre-Commit (Husky + lint-staged)

- Runs ESLint + Prettier on staged files only — fast, catches formatting/lint issues before they ever reach CI.

## Error Monitoring

- **Sentry** captures unhandled errors in both the client and server (Next.js API routes / server components), tagged by release. Set up from V1 — retrofitting error monitoring after real users exist means losing visibility into exactly the period you'd most want it.

## What "high standard" means here, concretely

- No PR merges with failing lint/typecheck/tests — enforced by branch protection on `main`.
- No untyped `any` slipping through review without a comment justifying it.
- Every schema change (`DATABASE.md`) ships with any corresponding RLS-policy or trigger test updates in the same PR.
- Critical-path Playwright tests are treated as a release gate, not a nice-to-have — if one fails, the deploy doesn't ship.
