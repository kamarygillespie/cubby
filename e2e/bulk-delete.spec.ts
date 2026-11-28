import { test, expect, seedItems, startSelecting } from "./fixtures";

// KAM-76: delete several items at once from Select mode.
test("delete selected items, naming the lists they're on", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [
    { title: "E2E Duplicate A", price: 20 },
    { title: "E2E Duplicate B", price: 20 },
    { title: "E2E Keeper", price: 30 },
  ]);
  await page.reload();

  // Put one of them on a list, so the confirmation names it.
  await startSelecting(page);
  await page.getByRole("checkbox", { name: "Select E2E Duplicate A" }).click();
  await page.getByRole("button", { name: "Add to wishlist" }).click();
  await page.getByLabel(/new list/i).fill("E2E Holiday");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Added 1 item to 1 list.");

  await startSelecting(page);
  await page.getByRole("checkbox", { name: "Select E2E Duplicate A" }).click();
  await page.getByRole("checkbox", { name: "Select E2E Duplicate B" }).click();
  await page.getByRole("button", { name: "Delete selected items" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Delete 2 items?")).toBeVisible();
  await expect(dialog.getByText(/removed from E2E Holiday/)).toBeVisible();

  // Canceling changes nothing.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("E2E Duplicate A")).toBeVisible();

  await page.getByRole("button", { name: "Delete selected items" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete 2 items" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Deleted 2 items.");
  await expect(page.getByText("E2E Duplicate A")).toHaveCount(0);
  await expect(page.getByText("E2E Duplicate B")).toHaveCount(0);
  await expect(page.getByText("E2E Keeper")).toBeVisible();
});
