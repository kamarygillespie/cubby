import { test, expect, expectNoHorizontalScroll } from "./fixtures";

test("create a custom item type + category while adding an item, then manage it", async ({
  page,
}) => {
  await page.goto("/items/new");
  await page.getByLabel("Title").fill("E2E Fig Candle");

  // "+ New type" with a brand-new category
  await page.getByRole("button", { name: "New type" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("E2E Candles");
  await dialog.getByLabel("Category").click();
  await page.getByRole("option", { name: "+ New category" }).click();
  await dialog.getByLabel("New category name").fill("E2E Home");
  await dialog.getByRole("button", { name: "Create type" }).click();
  await expect(dialog).toHaveCount(0);

  // The new type is selected, and the rest of the form kept its values
  await expect(page.getByLabel("Item type")).toContainText("E2E Candles");
  await expect(page.getByLabel("Title")).toHaveValue("E2E Fig Candle");
  await page.getByRole("button", { name: "Add item" }).click();

  await expect(page).toHaveURL(/\/$/);
  const card = page.getByRole("listitem").filter({ hasText: "E2E Fig Candle" });
  await expect(card).toContainText("E2E Candles · E2E Home");

  // Manage page: it's listed under its category with its item count
  await page.goto("/types");
  await expectNoHorizontalScroll(page);
  await expect(page.getByText("E2E Home")).toBeVisible();
  await expect(page.getByText("E2E Candles")).toBeVisible();

  // Duplicate names are rejected (ignoring case), and built-ins can't clash
  const homeCard = page.locator("li", { hasText: "E2E Home" }).first();
  await homeCard.getByRole("button", { name: "Add type" }).click();
  await homeCard.getByLabel("New type name").fill("e2e candles");
  await homeCard.getByRole("button", { name: "Add", exact: true }).click();
  await expect(homeCard.getByRole("alert")).toContainText("already have");
  await homeCard.getByRole("button", { name: "Cancel" }).click();

  // In use → can't delete, with a reason
  await page.getByRole("button", { name: "Delete E2E Candles" }).click();
  await expect(page.getByText("Items still use this type")).toBeVisible();

  // Rename flows through to the item card
  await page.getByRole("button", { name: "Rename E2E Candles" }).click();
  await page.getByLabel("Rename E2E Candles").fill("E2E Candles & Scents");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("E2E Candles & Scents")).toBeVisible();
  await page.goto("/");
  await expect(card).toContainText("E2E Candles & Scents · E2E Home");
});
