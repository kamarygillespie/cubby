import { test, expect, seedItems, seedWishlist } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-75: a sold-out size shows on the card; a restock sends an alert.
test("sold out in my size, then back in stock", async ({
  page,
  user,
  browser,
}) => {
  const [pants] = await seedItems(user.id, [
    { title: "E2E Stock Pants", price: 50 },
  ]);
  await admin
    .from("items")
    .update({ link: "https://shop.example/pants", notes: "size M" })
    .eq("id", pants.id);
  const check = async (inStock: boolean) => {
    const { error } = await admin.rpc("record_price_check", {
      p_item_id: pants.id,
      p_price: 50,
      p_sale_price: null as unknown as number,
      p_in_stock: inStock,
      p_stock_size: "m",
    });
    if (error) throw error;
  };

  await check(false);
  await page.reload();
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Stock Pants" });
  await expect(card.getByText("Sold out in M")).toBeVisible();

  // Givers see it too, so nobody buys something sold out in that size.
  const listId = await seedWishlist(user.id, "E2E Stock List", [pants.id]);
  const { data: list } = await admin
    .from("wishlists")
    .select("share_token")
    .eq("id", listId)
    .single();
  const giver = await (await browser.newContext()).newPage();
  await giver.goto(`${new URL(page.url()).origin}/share/${list!.share_token}`);
  await expect(giver.getByText("Sold out in M")).toBeVisible();
  // KAM-101: notes (size, color) show to givers by default...
  await expect(giver.getByText("size M", { exact: true })).toBeVisible();
  // ...and the list can hide them.
  await page.goto(`/wishlists/${listId}`);
  await page
    .getByRole("checkbox", { name: "Show my notes on the share link" })
    .click();
  await expect(async () => {
    await giver.reload();
    await expect(giver.getByText("size M", { exact: true })).toHaveCount(0, {
      timeout: 1000,
    });
  }).toPass();

  await check(true);
  await page.reload();
  await expect(card.getByText(/Sold out/)).toHaveCount(0);
  await page.goto("/notifications");
  await expect(
    page.getByText("E2E Stock Pants is back in stock"),
  ).toBeVisible();
  await expect(page.getByText("Available again in size M.")).toBeVisible();
});
