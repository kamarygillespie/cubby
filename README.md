# Cubby

> A wishlist and spending tracker for fashion, beauty, and lifestyle items — part Notion, part Pinterest. Built to be genuinely useful for one person on day one, and architected to grow into a real multi-user product.

## The Problem

Wishlists live scattered across screenshots, browser bookmarks, and notes apps. There's no good way to:

- See everything you want in one organized, filterable place
- Track what you've spent vs. what you're still eyeing
- Share a curated wishlist with different people (parents, partner, friends) around the holidays **without accidentally giving two people the same item**
- Know at a glance what's on sale right now

Cubby solves this with a single, opinionated home for "things I want," organized by category and item type, with first-class support for curating and sharing wishlists.

## Who It's For

- **V1:** Built for one power user (you) who wants serious organization and control.
- **V1.5+:** Architected from day one as a real multi-tenant product — every user gets their own private data — so it can be opened up to other users without a rebuild.

## Target Launch

**October 10, 2026** — a personal-use V1: fully functional end-to-end for a single user, with the real multi-tenant foundation underneath. A broader "invite others" launch comes later, once the app has been lived with through a real gift-giving season.

## Document Index

| Doc                                    | What it covers                          | Read this when...                                              |
| -------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| [`CLAUDE.md`](./CLAUDE.md)             | Repo map, commands, conventions         | Working in the codebase (Claude Code reads this automatically) |
| [`TECH_STACK.md`](./TECH_STACK.md)     | Stack choices and why                   | Setting up tooling, adding a dependency                        |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System design, data flow, multi-tenancy | Designing a new feature or service boundary                    |
| [`FEATURES.md`](./FEATURES.md)         | Versioned feature roadmap (V1–V4)       | Deciding what's in scope for now vs. later                     |
| [`DATABASE.md`](./DATABASE.md)         | Schema, SQL, RLS policies               | Touching the database or adding a table/field                  |
| [`TESTING.md`](./TESTING.md)           | Testing philosophy, CI/CD pipeline      | Writing tests, setting up CI                                   |
| [`ROADMAP.md`](./ROADMAP.md)           | Week-by-week plan to Oct 10             | Planning the week's work / Linear tickets                      |

## Core Vibe

Notion's organization + Pinterest's visual appeal. Minimal and calm, not overwhelming — but feature-rich enough to feel genuinely powerful once you're in it. Should work equally well as an installed mobile app (PWA) and a desktop browser tab.

## One-Line Tech Summary

Next.js (React/TypeScript) + Tailwind/shadcn, on Supabase (Postgres, Auth, Storage), hosted on Vercel, PWA-installable, tested with Vitest + Playwright, CI/CD via GitHub Actions. See `TECH_STACK.md` for the full reasoning.
