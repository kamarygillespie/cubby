import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-86: the year's recap from your own data, shareable without amounts.
test("Year in Cubby recaps the year and shares it", async ({ page, user }) => {
  const [boots] = await seedItems(user.id, [
    {
      title: "E2E Recap Boots",
      price: 200,
      sale_price: 150,
      store_brand: "Madewell",
    },
    { title: "E2E Recap Tee", price: 30, store_brand: "Madewell" },
  ]);
  await admin
    .from("items")
    .update({ purchased: true, interest_level: 5 })
    .eq("id", boots.id);
  await admin.from("item_wears").insert([
    { user_id: user.id, item_id: boots.id },
    { user_id: user.id, item_id: boots.id },
  ]);

  await page.goto("/recap");
  const year = new Date().getFullYear();
  await expect(
    page.getByRole("heading", { name: `Your ${year} in Cubby` }),
  ).toBeVisible();
  const cards = page.getByRole("list", { name: `Your ${year} in Cubby` });
  await expect(cards.getByText("2 things")).toBeVisible();
  await expect(
    cards.getByText("and saved $50.00 by waiting for sales."),
  ).toBeVisible();
  await expect(cards.getByText("Madewell")).toBeVisible();
  await expect(cards.getByText("Worn 2 times this year.")).toBeVisible();

  const share = page.getByRole("region", { name: "Share" });
  await expect(share).toContainText("Wish come true: E2E Recap Boots");
  await expect(share).not.toContainText("Saved $50.00");
  await share.getByRole("checkbox", { name: "Include amounts" }).click();
  await expect(share).toContainText("Saved $50.00 by buying on sale");
});
