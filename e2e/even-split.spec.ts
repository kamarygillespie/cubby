import { test, expect, seedItems } from "./fixtures";

test("split selected items evenly into new lists", async ({ page, user }) => {
  await seedItems(user.id, [
    { title: "E2E Coat", price: 100 },
    { title: "E2E Boots", price: 90 },
    { title: "E2E Bag", price: 60 },
    { title: "E2E Scarf", price: 50 },
  ]);
  await page.reload();

  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Select all" }).click();
  await page
    .getByRole("button", { name: "Split selected items evenly into lists" })
    .click();

  const dialog = page.getByRole("dialog");
  // Preview: 100+50 vs 90+60
  await expect(dialog.getByText("$150.00")).toHaveCount(2);
  await expect(dialog.getByText("Totals are within $0.00")).toBeVisible();
  await dialog.getByLabel("List 1 name").fill("E2E Mom");
  await dialog.getByLabel("List 2 name").fill("E2E Dad");
  await dialog.getByRole("button", { name: "Create 2 lists" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Split 4 items into 2 lists.",
  );

  await page.goto("/wishlists");
  for (const name of ["E2E Mom", "E2E Dad"]) {
    await expect(
      page.getByRole("listitem").filter({ hasText: name }),
    ).toContainText("2 items · $150.00");
  }
});
