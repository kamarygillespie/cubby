import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-75: a sold-out size shows on the card; a restock sends an alert.
test("sold out in my size, then back in stock", async ({ page, user }) => {
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

  await check(true);
  await page.reload();
  await expect(card.getByText(/Sold out/)).toHaveCount(0);
  await page.goto("/notifications");
  await expect(
    page.getByText("E2E Stock Pants is back in stock"),
  ).toBeVisible();
  await expect(page.getByText("Available again in size M.")).toBeVisible();
});
