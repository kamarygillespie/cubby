import { test, expect, seedItems } from "./fixtures";

// KAM-102: jot down something you're looking for, then "Found it".
test("looking for: add, find it, and include it in Copy wishlist", async ({
  page,
  user,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await seedItems(user.id, [{ title: "E2E Existing Mug", price: 20 }]);

  await page.goto("/looking-for");
  await page.getByLabel("What are you looking for?").fill("E2E Desk lamp");
  await page.getByRole("button", { name: "Add a budget or notes" }).click();
  await page.getByLabel("Budget (up to)").fill("60");
  await page.getByLabel("Notes").fill("warm light, small");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const list = page.getByRole("list", { name: "Looking for" });
  await expect(list).toContainText("E2E Desk lamp");
  await expect(list).toContainText("Up to $60.00 · warm light, small");

  // Copy wishlist asks for products for it.
  await page.goto("/");
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Copy wishlist" }).click();
  const text = page.getByRole("dialog").getByRole("textbox", {
    name: "Wishlist text",
  });
  await expect(text).toHaveValue(
    /## Still looking for\n- E2E Desk lamp \(under \$60\.00\): warm light, small/,
  );
  await page.keyboard.press("Escape");

  // Found it → Add item, prefilled, then ticked off.
  await page.goto("/looking-for");
  await page
    .getByRole("link", { name: "Found it: add E2E Desk lamp to your wishlist" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Found your e2e desk lamp?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add without a link" }).click();
  await page.getByLabel("Title").fill("E2E Brass Desk Lamp");
  await page.getByLabel("Item type").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Add details" }).click();
  await expect(page.getByLabel("Notes")).toHaveValue("warm light, small");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/looking-for");
  await expect(page.getByRole("list", { name: "Looking for" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Found" })).toContainText(
    "→ E2E Brass Desk Lamp",
  );
});
