# CLAUDE.md

This file is read automatically by Claude Code. Keep it short — it's a **router**, not a reference. Full detail lives in the linked docs; don't duplicate it here.

## What this project is

Cubby: a multi-tenant wishlist/spending tracker (Next.js + Supabase). See `/planning/README.md` for the full vision.

## Doc index — load only what the task needs

- Schema/DB work → `/planning/DATABASE.md`
- New feature, unsure of scope/version → `/planning/FEATURES.md`
- System design / where does this logic belong → `/planning/ARCHITECTURE.md`
- Dependency or tooling choice → `/planning/TECH_STACK.md`
- Writing/running tests, CI → `/planning/TESTING.md`
- "What's this week's work" → `/planning/ROADMAP.md`

Do not load every doc for every task — pick the one(s) relevant to the change at hand.

## Commands

```bash
npm run dev          # local dev server
npm run build         # production build
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run test          # vitest unit/integration tests
npm run test:e2e      # playwright e2e (requires local Supabase or test env)
npm run db:migrate    # apply Supabase migrations locally
npm run db:seed       # seed default categories/item types
```

## Conventions

- **TypeScript strict mode.** No `any` without a comment explaining why.
- **Components:** functional, colocated with their route where reasonable (`app/` directory, Next.js App Router).
- **Styling:** Tailwind utility classes + shadcn/ui components. No ad-hoc CSS files unless truly necessary.
- **Data access:** all Supabase queries go through typed helper functions in `lib/db/`, not scattered `supabase.from(...)` calls in components.
- **Multi-tenancy is not optional.** Every table with user data has a `user_id` column and a Row Level Security policy. Never add a query that bypasses RLS without an explicit, commented reason (e.g. the public wishlist-share endpoint).
- **Commits:** Conventional Commits style (`feat:`, `fix:`, `chore:`, `test:`) — keeps changelogs and CI readable.
- **Linking work to Linear:** the GitHub ↔ Linear integration is installed on this repo, so branch names and commit/PR text tie work back to its ticket. For anything beyond a trivial direct-to-main change, branch using the ticket's Linear-suggested branch name (e.g. `kamigillespie/kam-5-...`). Reference the ticket ID in commit messages or PR descriptions — `Fixes KAM-5` / `Closes KAM-5` auto-marks the ticket Done on merge, `Refs KAM-5` just links it without changing status.

## Before considering a task done

1. `npm run typecheck` and `npm run lint` pass.
2. Relevant unit tests added/updated and passing (`npm run test`).
3. If the change touches a critical user flow (auth, add item, share list, mark purchased), confirm the corresponding Playwright test still passes or update it.
4. If the schema changed, `DATABASE.md` is updated to match.
5. If any other meaningful business-logic or architecture decision was made (not just schema) — a new rule, a changed assumption, a scope cut, a tradeoff — the relevant planning doc (`ARCHITECTURE.md`, `FEATURES.md`, etc.) is updated in the same PR so the docs never drift out of sync with the real app.

## Sync Protocol — Staying in Sync with the Planning Chat

This project is planned in a separate Claude conversation (not Claude Code) that doesn't have filesystem access to this repo. Linear is the bridge between the two. Follow this so the planning side always has an accurate picture of where things stand:

- **Use the same Linear connector Claude Code has access to.** Move tickets through their real status (Todo → In Progress → Done) as you work — don't batch-update at the end. The planning chat reads live ticket status before creating the next batch of work, not your summary of it.
- **If a ticket's actual implementation diverges from its description** (a different approach, an extra step, something that turned out to be harder/easier, a scope change), leave a comment on that ticket explaining what changed and why. Don't just silently do something different.
- **At the end of each week** (per `ROADMAP.md`), write a short changelog as a comment on that week's tracking or as a Linear document attached to the "Cubby V1" project: what shipped, what didn't, and anything that diverged from the original plan or introduced a new business rule. Keep it brief — a few bullets, not a report.
- **Planning docs in the repo remain the durable source of truth for architecture/schema/features** (per the "Before considering a task done" checklist above). Linear comments/changelogs are the fast, ephemeral layer that tells the planning chat _where to look_ and _what changed recently_ — they're not a replacement for updating the actual docs.

## Things to never do

- Never disable RLS on a table to "make it work" — fix the policy instead.
- Never commit secrets (Supabase service role key, API keys) — use `.env.local`, which is gitignored.
- Never add a new top-level planning doc without a good reason — extend an existing one first.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
