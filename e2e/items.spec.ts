import { test, expect, expectNoHorizontalScroll, seedItems } from "./fixtures";

test("add an item manually", async ({ page, user }) => {
  await page.getByRole("link", { name: "Add item" }).click();
  await expect(page).toHaveURL(/\/items\/new/);

  await page.getByLabel("Title").fill("E2E Linen Shirt");
  await page.getByLabel("Item type").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Price", { exact: true }).fill("80");
  await page.getByLabel("Sale price").fill("60");
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.getByLabel("Store / brand").fill("Everlane");
  await page.getByRole("button", { name: "Add item" }).click();

  await expect(page).toHaveURL(/\/$/);
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Linen Shirt" });
  await expect(card).toContainText("$60.00");
  await expect(card).toContainText("$80.00");
  await expect(card).toContainText("Everlane");
  // e2e emails are long (e2e-<uuid>@example.com) — a good overflow check.
  await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("mark an item purchased, then gifted", async ({ page, user }) => {
  await seedItems(user.id, [{ title: "E2E Boots", price: 200 }]);
  await page.reload();

  const card = () =>
    page.getByRole("listitem").filter({ hasText: "E2E Boots" });

  await card().getByRole("button", { name: "Mark purchased" }).click();
  await expect(card()).toHaveCount(0); // leaves the Wishlist tab

  await page.getByRole("button", { name: "Purchased", exact: true }).click();
  await expect(card()).toBeVisible();
  await expect(
    card().getByRole("button", { name: "Purchased", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Totals", exact: true }).click();
  await expect(page.getByText("$200.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Gifted", exact: true }).click();
  await expect(card()).toHaveCount(0);
  await page.getByRole("button", { name: "Purchased", exact: true }).click();
  await card().getByRole("button", { name: "Mark gifted" }).click();
  await page.getByRole("button", { name: "Gifted", exact: true }).click();
  await expect(card()).toBeVisible();
});
