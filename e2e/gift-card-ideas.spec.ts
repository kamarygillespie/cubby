import { test, expect, seedItems, seedWishlist } from "./fixtures";

test("gift card ideas show on a shared list and on Totals", async ({
  page,
  user,
  browser,
}) => {
  const items = await seedItems(user.id, [
    { title: "E2E Hoops", price: 65, sale_price: 52, store_brand: "Mejuri" },
    { title: "E2E Chain", price: 120, store_brand: "mejuri " },
    { title: "E2E Tee", price: 30, store_brand: "Everlane" },
  ]);
  const listId = await seedWishlist(
    user.id,
    "E2E Gifts",
    items.map((i) => i.id),
  );

  // Owner's list page shows what givers will see
  await page.goto(`/wishlists/${listId}`);
  await expect(
    page.getByRole("heading", { name: "Gift card ideas" }),
  ).toBeVisible();
  // One row per suggested store; Everlane has just 1 item, so no row.
  const ideaRow = (p: typeof page, store: string) =>
    p
      .getByRole("listitem")
      .filter({ hasText: store })
      .filter({ hasText: /items ·/ });
  await expect(ideaRow(page, "Mejuri")).toContainText("2 items · $172.00");
  await expect(ideaRow(page, "Everlane")).toHaveCount(0);

  // A signed-out gift-giver sees it on the share page
  const shareHref = await page
    .getByRole("link", { name: "Preview" })
    .getAttribute("href");
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(new URL(page.url()).origin + shareHref);
  await expect(
    visitor.getByRole("heading", { name: "Gift card ideas" }),
  ).toBeVisible();
  await expect(ideaRow(visitor, "Mejuri")).toContainText("2 items · $172.00");

  // Totals
  await page.goto("/?view=totals");
  await expect(
    page.getByRole("heading", { name: "Gift card ideas" }),
  ).toBeVisible();
  await expect(page.getByText("2 items · $172.00")).toBeVisible();
});
