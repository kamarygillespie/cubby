# Features — Versioned Roadmap

Scope is deliberately tight for V1 so Oct 10 is achievable, with everything else queued up rather than dropped.

## V1 — Launch Target: Oct 10, 2026

**Goal:** fully usable, end-to-end, for a single real user (you), on real multi-tenant infrastructure.

### Core data & item management

- Full item schema: title, image, link, price, interest level (1–5 stars), purchased (+ auto purchased date), gifted, notes, store/brand, item type, category (auto-derived from item type)
- Add item via pasted link → server-side autofill (title/image/price) with full manual edit + image replacement. **Link-first flow (KAM-57):** Add item opens with only a link field and fetches on paste. It then shows a product preview and asks for just item type, interest level and notes (where color, size and other specifics go); everything else is under **Add details**. **Add without a link** opens manual entry, and a page Cubby can't read falls back to manual entry with the link kept. **Suggestions (KAM-58):** the store fills in from the page's brand, then its site name, then its web address. Up to 3 likely item types appear as one-tap choices, matched by keyword on the product name, the store's category and the link (first-party, no AI), plus **Something else** for the full list. A type is never chosen without a tap. **Stores that block apps (KAM-64):** some stores refuse automated requests. Cubby names the store, fills in its name, keeps the link for manual entry, and shows when the latest price check couldn't read the page. Ad and tracking values are removed from saved links
- **Save to Cubby (KAM-65):** a bookmark (computer) or Apple Shortcut (iPhone), set up at `/save-to-cubby`, reads the product page open in the user's own browser and opens Add item with the details filled in, so it works at stores that block Cubby. Using it on an already saved item offers to update its price. **Best Buy and Etsy (KAM-66)** use their official APIs for autofill and automatic price checks once API keys are configured
- Add/edit item manually (no link required). Edit at `/items/<id>/edit` (Edit on each card): all fields, plus replace or remove the image (the old file is deleted from storage). Delete lives on the edit page behind a confirmation that names any wishlists the item will drop off
- Default system taxonomy for Category and Item Type, seeded on signup
- Users can add their own custom Item Types (auto-mapped to a Category) and, if needed, custom Categories: "+ New type" on the add/edit form (optionally creating a new category in the same step), and a **Manage types** page at `/types` to add, rename and delete your own. Built-ins are read-only. Names are unique per user ignoring case, including against built-ins. A type that items still use, or a category that still has types, can't be deleted (with a message saying why)

### Views & organization

- All-items view. **Photo-first grid (KAM-59):** items show as photo cards (2 columns on phones, up to 4 on desktop) with just the name, price and sale badge. **Store link on the card (KAM-89):** a card with a link has an open-link button in the photo's top-right corner (44px tap area). It opens the store in a new tab without opening the details sheet, and it's hidden in Select mode. **Needs a manual check (KAM-90):** when an active item's latest price check (in the last 3 days) couldn't read the page, its card says "Check by hand" under the price, and the Filter sheet's **Show** section offers **Needs a manual check (N)** (`?check=1`). The flag clears on the next readable check, a Save to Cubby price update, or a price typed in on the edit page (recorded as a check after the edit, so it never triggers a price alert). **Item details (KAM-60):** tapping a card opens a sheet with the full details and every action: Mark purchased, Mark gifted, Open link, Edit, Check price, Delete (with a confirmation that names any lists it's on), and which lists it's on. **One toolbar (KAM-61):** tabs, a single **Filter** button (sort, on sale, favorite stores, category, item type, grouping), removable chips for what's applied, and a **…** menu for Select and Check all prices. On desktop, account details, theme and Log out sit in an account menu
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

- Sale price + discount % captured at add-time or on manual refresh: **Check price** in the details of any wishlist item with a link, and **Check all prices** in the Wishlist tab's **…** menu (checks what the tab is showing, with a summary like "2 now on sale, 5 unchanged"). **Faster (KAM-88):** up to 4 items at once, but never two from the same store at once and at least 1.5s between one store's pages. That's about 3–4× faster for a typical wishlist, with no more load on any store. **Check price in Select mode (KAM-94):** checks just the selected items that have a link, with the same progress, Stop and summary above the grid. Up to 6 stores at once (from 4). On phones the Select bar's actions are icons, plus "Add". Under 360px the count shows without "selected", so all five fit at 320px
- Visual "on sale" indicator
- **Added on sale (KAM-74):** when a store lists only the sale price in its standard product data, Cubby reads the original price from the store's own page data (e.g. Gymshark's `compareAtPrice`), so an item added on sale shows "$30, was $50, 40% off". This applies to autofill, Save to Cubby, Check price and the daily checks. Items already saved at only their sale price correct themselves on their next price check

### Wishlist sharing

- Multi-select items → add to one or more named wishlists (Wishlist tab only — purchased/gifted items aren't offered; a new list can be created inline from the picker, and re-adding an item already on a list is a silent no-op)
- Public, no-login share link per wishlist (`/share/<token>`, copied from the list page). Purchased/gifted items are hidden from it so givers don't duplicate a gift; the owner's notes are **not** shown (decided Nov 9, 2026, KAM-38: notes are personal, e.g. "wait for sale")
- **Gift claims (KAM-77):** on a share page, givers tap **I'm getting this** (optional name, no account) so nobody doubles up. Other givers see "Someone's getting this" (claimed items sort last), and the same browser can **Undo**. The owner doesn't see claims, even in their own preview, unless they turn on **Show claims** on /wishlists (off by default); then a list's page shows "Claimed by Aunt May"
- **Copy wishlist (KAM-91):** in the Wishlist tab's **…** menu. It copies the items shown (filters applied) as plain text: a summary (count, total, top stores and categories), then one line per item grouped by category (name | store | price, or sale price with "was" | type | interest | link). **Ask for ideas** (on by default) puts a prompt at the top, so the paste works as is in ChatGPT or Claude. **Include my notes** is off by default. A preview box doubles as a fallback when the clipboard is blocked. **Price range for ideas (KAM-93):** with Ask for ideas on, chips for **Under $30**, **$30 to $100** and **$100+** add "priced …" to the prompt. Several can be picked, and adjacent ones merge ("under $100"). None or all means any price. The list itself always includes every item. In-app AI suggestions are a separate proposal (KAM-92)
- **Sizes on share links (KAM-78):** **Your sizes** on /wishlists (tops, bottoms, dresses, shoes, rings, bras, plus free text). Share pages show a Sizes box and the matching size on each item ("Size 8.5" on boots, "Tops M · Bottoms 6" on a set). Each list's page has **Show my sizes on the share link** (on by default)
- **For givers (KAM-80):** 5-star items show **Most wanted** on the share page (other ratings stay private) and come first. Givers can filter **Under $25 / $50 / $100** (by the price they'd pay) and sort by price. Claimed items still sink to the end
- **Occasion dates (KAM-79):** each list's page has an optional **Occasion date**. The share page shows "Dec 25 · 28 days to go" (in the viewer's time zone, hidden once passed). /wishlists shows the date with a countdown or "Past". About 3 weeks ahead (or right away if it's set closer), the owner gets one reminder to send the link, through the bell and daily push. The list's name serves as the occasion's name, so there's no separate name field
- Clean, shareable export view (readable on any device, no account needed to view)
- UI surfaces which wishlist(s) an item is already on, to avoid accidentally duplicating an item across two people's lists (an "On: …" chip row in each item's details, plus "N already on it" in the add-to-wishlist picker)
- Wishlist management at `/wishlists`: create, rename, delete (items stay in your wishlist; only the list and its share link go), view a list's items with count + total, remove an item from a list. A list keeps items after they're marked purchased/gifted and labels them, so a gift-giver's list reflects what's been bought

### Platform

- Responsive web app
- Installable PWA (mobile + desktop)
- Theme picker: Light / Dim / Dark / System. "Dim" is the in-between option — a soft slate palette with lower contrast than dark; System (the default) follows the OS setting. Saved per device, not per account (see `ARCHITECTURE.md` → Theming)

## V1.5 — Post-Launch Hardening (no fixed date)

- Scheduled sale-price re-checks (not just at add-time): **built (KAM-43)**. Every active wishlist item with a link is re-checked about once a day automatically; cards show "Checked 3h ago"; every check is kept as price history
- Admin/taxonomy management UI polish (bulk edit, merge duplicate item types): **built (KAM-44)**. **Change type** in Select mode moves all selected items to one type; **Merge** on Manage types folds one of your types into another (built-in or yours), moving its items and deleting the duplicate atomically. **Delete in Select mode (KAM-76):** deletes every selected item after a confirmation that gives the count and names any lists they'll come off. Their uploaded photos are removed, and the page keeps its tab and filters and says "Deleted 3 items." On phones, Split, Change type and Delete show as icons and "Add to wishlist" shortens to "Add", so the bar fits on one row at 320px
- Performance pass on large wishlists (100+ items): **done (KAM-45)**. Lists render 50 cards at a time with "Show more" (counts, group totals, filters and Check all prices still cover every item); off-screen cards skip layout; /wishlists loads only prices
- Public launch readiness (onboarding flow, empty states, error states). **Built (KAM-46):** new accounts get a **Welcome to Cubby** checklist on the home page: add your first item, make a wishlist to share, star favorite stores, turn on price alerts. Each step ticks off from what the account actually has. Hiding it is saved on the profile, so it stays hidden on every device, and it disappears once all four are done. On phones, the install card sits below it. Empty states were re-checked on every page; Stores and Totals gained guidance

- **Backup & import (KAM-87):** `/data` (from More and the account menu). **Download CSV** saves every item (wishlist, bought, gifts, closet and archived) with its status, type, store, prices, interest, link, photo link, notes and dates. Cells a spreadsheet could run as formulas are escaped. **Import items** reads a Cubby backup or any CSV:
  - Columns are guessed from common names ("Product", "Cost", "Brand", "URL"…) and can be changed. A preview shows how many rows are ready and which have problems.
  - Unknown item types go to a chosen type, and statuses map back to wishlist, purchased, gifts, closet or archived.
  - Photos are copied into Cubby's storage through the same Edge Function as Save to Cubby. The server only accepts copies in the user's own folder, and re-parses every row itself.
  - Imports only add items, up to 1,000 at a time.

## V2 — Expansion

- **Closet view:** purchased items automatically appear in a closet gallery; ability to add standalone closet photos and replace item images from here. **Built (KAM-47)** at `/closet`. **Rule:** the closet = pieces added straight to it + things you bought for yourself (purchased, not gifted) + gifts you received (gifted, not purchased). Purchased _and_ gifted means you bought it for someone else, so it's not in your closet. Pieces added straight to the closet never count toward wishlist, spending or totals. Tap a piece to edit it or change its photo
- **Cost per wear (KAM-85):** each closet piece has **Wore it** and **Undo**, with "Worn 12× · $18.33/wear" (price paid, so the sale price when bought on sale). Pieces without a price, like ones added straight to the closet, show just the count. An outfit's page has **Wore this outfit**, which logs a wear for each piece, plus **Undo last**. The closet sorts by **Most worn**, **Least worn** or **Best cost per wear** (`?sort=`), together with the category filter
- **Outfit planning:** create outfit "boards" from closet items, or upload outfit photos to save. **Built (KAM-48)** at `/outfits` (linked from the Closet): a name, an optional photo, and closet pieces picked from a tap-to-select grid (only closet pieces are offered and accepted). The board shows the photo plus pieces; covers use the photo or a 2×2 collage. A piece's edit page shows "In outfits: …". Deleting an outfit keeps its pieces; deleting a piece removes it from outfits
- **Favorite stores:** mark favorite stores/brands, track when they're running a sale. **Built (KAM-49)** at `/stores`: one row per store on your wishlist (case-insensitive), with item count, value, and **"N on sale · up to X% off"** from the daily price checks. Star favorites (they float to the top and stay listed even with no items) and save an optional **sale page link** (a link, not scraped). "View items" filters the wishlist to a store; a **Favorite stores** filter toggle appears once you've starred any
- **Gift card recommendations:** group wishlist items by store/brand, ranked by relevance (most items from that store first). **Built (KAM-50):** shown on Totals, on each list's page, and on its **public share page** (scoped to that list). Ranked by item count, then total value; a store needs **2+ items** to be suggested; store names match regardless of case or spacing
- **Mobile app = the installable PWA** (decided Nov 8, 2026): no separate React Native codebase. The PWA gets a native feel instead: bottom tab bar on phones, offline shell, camera upload, share-to-Cubby (Android), install prompt (KAM-51). Revisit a true native app only if usage demands it. **Built (KAM-51):** phones get a 5-tab bar (Wishlist · Lists · Closet · Stores · More); theme, log out, Outfits, Item types, Totals and install help live under **More**. Photo fields offer camera or library, and photos are shrunk in the browser (max 1600px JPEG) before upload. **Share to Cubby** (Android/Chrome only — iOS Safari has no share targets) opens Add item with the shared link prefilled. Offline, page loads show a "You're offline" screen; no user data is cached offline

## V3 — Intelligence Layer

- Item recommendations based on interest level, category affinity, and purchase history. **Built (KAM-52), first-party only, no ML:** **Buy next** on Totals ranks wishlist items by interest (40), current discount (30), a recent drop vs. the last 30 days of price history (15), category affinity (10), and having bought from that store (5), and every pick shows its reasons. **Your taste** (top categories, go-to stores, the middle half of what you pay; needs 3+ purchases). **More like this** on each item's page (same type or store)
- Even-price-distribution wishlist generator: select items, choose N target wishlists, and auto-distribute items so each list ends up with a comparable total price. **Built (KAM-53)** as **Split** in Select mode: 2–6 _new_ lists, a live preview of each list's items and total, then create. Algorithm: highest price first, each item to the list with the lowest running total (greedy). Tighter than the originally planned round-robin, and just as simple. The server recomputes the split from database prices

## V4 — Notifications & Deeper Analytics

- Notifications for price drops on wishlist items and favorite-store sales, delivered as **phone push via the installed PWA** plus an in-app notifications list (decided Nov 8, 2026; no email for now) (KAM-54). **Built (KAM-54):** after each daily price check, an alert is created when a wishlist item's price drops by at least your threshold (default 10%), or a sale starts at a favorite store (once per store per week). Alerts show under the bell (`/notifications`, with an unread count); push is **one daily digest** per device, turned on per device. Settings: each alert type on/off and the drop threshold
- **Target price alerts (KAM-81):** **Alert me at or under $X** in a wishlist item's details (items with a link). After a price check, the item alerts once when its price crosses to the target or below, through the bell and daily push. It stays quiet while the price stays low and alerts again after the price goes back up and drops. It replaces that check's price-drop alert. Setting a target the item is already under just says so
- **Return windows (KAM-83):** a purchased item's details have **Return by**, with quick picks of 14, 30 or 60 days counted from the purchase day, or any date. Its card in the Purchased tab says "Return by Dec 12" (red in the last 3 days, hidden once passed). The owner gets one reminder 3 days before. **Mark returned** moves the item back to the wishlist and out of spending (it's an un-purchase, so delete it from there if it's no longer wanted). The date is set after buying, from the item's details, rather than in the Mark purchased step, so buying stays one tap
- **Monthly budget (KAM-84):** a **Monthly budget** card on Totals: set an amount, then see "$180 of $300 in November", a progress bar and what's left (or over), counted in the viewer's own month. Alerts at 80% and 100% (once each per month) through the bell and daily push, with an on/off setting on the alerts page ("At 80% and 100% of my monthly budget"). The budget is set on Totals itself rather than a settings page
- **Year in Cubby (KAM-86):** `/recap` (linked from Totals, and from a home-page banner during the viewer's December) is a set of swipeable cards for the year: things added and bought, spent and saved by buying on sale, top store and category, the most-wanted thing bought for yourself ("a wish come true"), and the most-worn piece (from cost per wear). It uses only the account's own data, worked out in the browser so the year follows the viewer's time zone (wears count from Jan 1 UTC). **Share my year** uses the phone's share sheet, or copies the text, with amounts left out unless **Include amounts** is on. It shares text rather than an image, to keep it simple and dependency-free. `?year=` shows other years
- **Cooling-off check-in (KAM-82):** `/check-in`, "Still want these?", lists wishlist items that are 60+ days old and rated 3 stars or less (or unrated), not kept in the last 90 days. Each has **Keep** or **Archive**, one tap each, and rows stay in place showing what happened. Archived items leave the wishlist, totals, lists and price checks, and **Restore** at the bottom brings them back (not onto their old lists). A home-page banner ("Still want these? 3 items to look over") appears while there's something to review. Hiding it lasts the rest of the month, and **A monthly "Still want these?" check-in** on the alerts page turns it off. It's a banner, not a push
- Spending breakdown by month, using `purchased_date` already captured since V1. **Built (KAM-55)** on Totals: a monthly bar chart (last 12 months, or any year with purchases); tap a month for its category breakdown and what was bought; a table view; undated purchases are counted separately. Months follow the **viewer's own time zone** (grouped in the browser)

## Later: After Cubby Has Real Traffic

- **Automatic price tracking through retailer affiliate feeds (KAM-67):** the approved way to track prices at stores that block Cubby, and a possible source of commission. Networks approve partners individually, so revisit once Cubby has enough users to qualify.

## Explicitly Out of Scope (for now)

- Payments/monetization — revisit once there's a public-launch plan
- Social features (following other users' public wishlists, etc.)

## Open Questions to Revisit

- Final app name/branding (see `README.md`)
- ~~Whether V3 recommendations need any external data source or stay purely first-party~~ → **first-party only** (decided Nov 8, 2026, KAM-52)
