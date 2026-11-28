import { test, expect, openItem, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-81: set a target price in an item's details; a price check that
// crosses it creates an alert.
test("a target price alerts when a check finds the item at that price", async ({
  page,
  user,
}) => {
  const [coat] = await seedItems(user.id, [
    { title: "E2E Target Coat", price: 200 },
  ]);
  await admin
    .from("items")
    .update({ link: "https://shop.example/coat" })
    .eq("id", coat.id);
  await page.reload();

  const sheet = await openItem(page, "E2E Target Coat");
  await sheet.getByLabel("Alert me at or under").fill("150");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(sheet.getByRole("status").last()).toHaveText(
    "Saved. You'll get an alert at $150.00 or less.",
  );

  // The daily check finds it on sale at $140.
  const { error } = await admin.rpc("record_price_check", {
    p_item_id: coat.id,
    p_price: 200,
    p_sale_price: 140,
  });
  if (error) throw error;

  await page.goto("/notifications");
  await expect(
    page.getByText("E2E Target Coat hit your target price"),
  ).toBeVisible();
  await expect(
    page.getByText("Now $140.00 (your target: $150.00)."),
  ).toBeVisible();
  await expect(page.getByText(/E2E Target Coat dropped to/)).toHaveCount(0);
});
