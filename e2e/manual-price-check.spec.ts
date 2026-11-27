import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-89 + KAM-90: open a store link from its card, and spot, filter and
// clear items Cubby couldn't price-check.
test("cards link to the store and flag items that need a manual check", async ({
  page,
  user,
}) => {
  const [blocked, fine] = await seedItems(user.id, [
    { title: "E2E Blocked Store", price: 80 },
    { title: "E2E Readable Store", price: 40 },
  ]);
  for (const [item, link] of [
    [blocked, "https://blocked.example/p/1"],
    [fine, "https://readable.example/p/2"],
  ] as const) {
    const { error } = await admin
      .from("items")
      .update({ link })
      .eq("id", item.id);
    if (error) throw error;
  }
  const { error } = await admin.from("item_price_checks").insert({
    item_id: blocked.id,
    user_id: user.id,
    status: "unreadable",
  });
  if (error) throw error;
  await page.reload();

  // One-tap store link on each card, without opening the details sheet.
  const link = page.getByRole("link", {
    name: "Open E2E Readable Store at the store",
  });
  await expect(link).toHaveAttribute("href", "https://readable.example/p/2");
  await expect(link).toHaveAttribute("target", "_blank");

  // Only the unreadable item is flagged.
  const blockedCard = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Blocked Store" });
  const readableCard = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Readable Store" });
  await expect(blockedCard.getByText("Check by hand")).toBeVisible();
  await expect(readableCard.getByText("Check by hand")).toHaveCount(0);

  // The filter lists just the flagged items.
  await page
    .getByRole("button", { name: /filter/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Needs a manual check (1)" }).click();
  await page.keyboard.press("Escape");
  await expect(blockedCard).toBeVisible();
  await expect(readableCard).toHaveCount(0);

  // Updating the price by hand clears the flag.
  await page.goto(`/items/${blocked.id}/edit`);
  await page.getByLabel("Price", { exact: true }).fill("75");
  await page.getByRole("button", { name: /save/i }).click();
  await page.waitForURL("/");
  await expect(blockedCard.getByText("Check by hand")).toHaveCount(0);
});
