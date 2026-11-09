import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

test("Buy next, Your taste, and More like this", async ({ page, user }) => {
  const items = await seedItems(user.id, [
    { title: "E2E Bought Tee", price: 30, store_brand: "Everlane" },
    { title: "E2E Bought Jeans", price: 98, store_brand: "Everlane" },
    { title: "E2E Bought Sweater", price: 120, store_brand: "Everlane" },
    {
      title: "E2E Loved Cardigan",
      price: 128,
      sale_price: 89,
      store_brand: "Everlane",
    },
    { title: "E2E Maybe Hoops", price: 65, store_brand: "Mejuri" },
  ]);
  const byTitle = Object.fromEntries(items.map((i) => [i.title, i.id]));
  for (const t of [
    "E2E Bought Tee",
    "E2E Bought Jeans",
    "E2E Bought Sweater",
  ]) {
    await admin.from("items").update({ purchased: true }).eq("id", byTitle[t]);
  }
  await admin
    .from("items")
    .update({ interest_level: 5 })
    .eq("id", byTitle["E2E Loved Cardigan"]);
  await admin
    .from("items")
    .update({ interest_level: 2 })
    .eq("id", byTitle["E2E Maybe Hoops"]);

  await page.goto("/?view=totals");
  await expect(page.getByRole("heading", { name: "Buy next" })).toBeVisible();
  // Picks are the list rows that carry reasons.
  const topPick = page
    .getByRole("listitem")
    .filter({ hasText: /you buy a lot of/ })
    .first();
  await expect(topPick).toContainText("E2E Loved Cardigan");
  await expect(topPick).toContainText(
    "5★ · 30% off · you buy a lot of Clothing · you've bought from Everlane before",
  );
  await expect(page.getByRole("heading", { name: "Your taste" })).toBeVisible();
  await expect(page.getByText("Go-to stores")).toBeVisible();

  // More like this: same store
  await topPick.getByRole("link", { name: "E2E Loved Cardigan" }).click();
  const similar = page.locator("section", {
    has: page.getByRole("heading", { name: "More like this" }),
  });
  await expect(
    similar.getByRole("link", { name: "E2E Bought Jeans" }),
  ).toBeVisible();
});
