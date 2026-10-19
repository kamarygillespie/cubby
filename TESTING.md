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
| End-to-end  | Playwright                           | Critical user flows listed above, run against a production build + local Supabase on every PR                    |

## CI Pipeline (GitHub Actions)

**On every pull request (and on push to `main`):**

1. Install dependencies (cached)
2. `npm run lint`
3. `npm run typecheck`
4. Edge Function check + `deno test`
5. `npx supabase start` (local stack: real Postgres, RLS, triggers, auth)
6. `npm run test` (unit + integration)
7. `npm run build`
8. `npm run test:e2e` (Playwright against that build and the local stack); on failure the report + traces are uploaded as an artifact
9. Vercel automatically creates a preview deployment for the PR

**On merge to `main`:** Vercel promotes to production; Sentry release tagged with the commit SHA, so errors map back to the exact deploy that caused them.

### Why e2e runs against local Supabase, not a deployment

The original plan ran e2e against the preview/production deployment after merge. Changed (KAM-31): those deployments talk to the real Supabase project, and the tests sign up users and write data — that would pollute production. Running against a production build wired to `supabase start` exercises the same code and real RLS/auth, runs _before_ merge (a true gate), and needs no secrets. A read-only smoke check against the live deployment can be added later if it proves useful.

### Running e2e locally

- `npx supabase start`, then `npm run test:e2e`. Playwright builds the app and serves it on port 3100 with the local Supabase URL/key hard-wired in `playwright.config.ts` — it never touches `.env.local`'s hosted project, and it won't reuse an existing server.
- Specs live in `e2e/`; `e2e/fixtures.ts` seeds data via the local service-role client and gives each test a fresh signed-in user (deleted afterwards). Every spec runs at desktop and phone sizes.
- Covered: sign up / log in / log out, the login redirect, add an item, mark purchased → gifted (+ totals), multi-select → new wishlist → public share link as a signed-out visitor (purchased items drop off). Link autofill isn't e2e-tested: it fetches external URLs, and the Edge Function's SSRF guard (correctly) blocks local fixture servers. Its parsing is covered by the Deno tests.

## Pre-Commit (Husky + lint-staged)

- Runs ESLint + Prettier on staged files only — fast, catches formatting/lint issues before they ever reach CI.

## Error Monitoring

- **Sentry** captures unhandled errors in both the client and server (Next.js API routes / server components), tagged by release. Set up from V1 — retrofitting error monitoring after real users exist means losing visibility into exactly the period you'd most want it.
- Org `kg-s7`, project `cubby`. Client init lives in `src/instrumentation-client.ts`, server/edge in `src/sentry.server.config.ts` / `src/sentry.edge.config.ts` (loaded by `src/instrumentation.ts`), React render errors caught in `src/app/global-error.tsx`.
- Needs `NEXT_PUBLIC_SENTRY_DSN` (public, safe client-side) and `SENTRY_AUTH_TOKEN` (build-time only, for source map upload — build succeeds without it, just skips upload) in the environment.

## What "high standard" means here, concretely

- No PR merges with failing lint/typecheck/tests — enforced by branch protection on `main`.
- No untyped `any` slipping through review without a comment justifying it.
- Every schema change (`DATABASE.md`) ships with any corresponding RLS-policy or trigger test updates in the same PR.
- Critical-path Playwright tests are treated as a release gate, not a nice-to-have — if one fails, the deploy doesn't ship.
