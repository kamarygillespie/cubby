import { test, expect, seedItems, seedWishlist } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-78 + KAM-80: givers see the owner's sizes next to the items they fit,
// a Most wanted badge, and can filter by budget.
test("share page shows sizes, most wanted and a budget filter", async ({
  page,
  user,
  browser,
}) => {
  const [boots, scarf] = await seedItems(user.id, [
    { title: "E2E Size Boots", price: 120 },
    { title: "E2E Size Scarf", price: 30 },
  ]);
  const { data: bootsType } = await admin
    .from("item_types")
    .select("id")
    .eq("name", "Boots")
    .eq("is_system", true)
    .single();
  await admin
    .from("items")
    .update({ item_type_id: bootsType!.id, interest_level: 5 })
    .eq("id", boots.id);
  const listId = await seedWishlist(user.id, "E2E Sizes", [boots.id, scarf.id]);

  // The owner adds sizes on the Lists page.
  await page.goto("/wishlists");
  await page.getByLabel("Shoes").fill("8.5");
  await page.getByLabel("Tops").fill("M");
  await page.getByRole("button", { name: "Save sizes" }).click();
  await expect(page.getByRole("status")).toHaveText("Sizes saved.");

  const { data } = await admin
    .from("wishlists")
    .select("share_token")
    .eq("id", listId)
    .single();
  const giver = await (await browser.newContext()).newPage();
  await giver.goto(`${new URL(page.url()).origin}/share/${data!.share_token}`);

  const sizes = giver.getByRole("region", { name: "Sizes" });
  await expect(sizes).toContainText("Shoes");
  await expect(sizes).toContainText("8.5");
  const bootsCard = giver
    .getByRole("listitem")
    .filter({ hasText: "E2E Size Boots" });
  await expect(bootsCard.getByText("Most wanted")).toBeVisible();
  await expect(bootsCard.getByText("Size 8.5")).toBeVisible();

  // Budget filter.
  await giver.getByRole("button", { name: "Under $50" }).click();
  await expect(bootsCard).toHaveCount(0);
  await expect(giver.getByText("E2E Size Scarf")).toBeVisible();
  await giver.getByRole("button", { name: "Any price" }).click();
  await expect(bootsCard).toBeVisible();

  // The list can hide sizes.
  await page.goto(`/wishlists/${listId}`);
  await page
    .getByRole("checkbox", { name: "Show my sizes on the share link" })
    .click();
  await expect(async () => {
    await giver.reload();
    await expect(giver.getByRole("region", { name: "Sizes" })).toHaveCount(0, {
      timeout: 1000,
    });
  }).toPass();
});
