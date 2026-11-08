import { test, expect, seedItems } from "./fixtures";

test("bulk-change item type, then merge a duplicate type away", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [
    { title: "E2E Chelsea", price: 150 },
    { title: "E2E Combat", price: 180 },
  ]);

  // A custom duplicate-ish type under Shoes
  await page.goto("/types");
  const shoes = page.locator("li", { hasText: "Shoes" }).first();
  await shoes.getByRole("button", { name: "Add type" }).click();
  await shoes.getByLabel("New type name").fill("E2E Ankle Boots");
  await shoes.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("E2E Ankle Boots")).toBeVisible();

  // Select both items → Change type → the custom type
  await page.goto("/");
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select E2E Chelsea" }).click();
  await page.getByRole("checkbox", { name: "Select E2E Combat" }).click();
  await page
    .getByRole("button", { name: "Change type of selected items" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("New item type").click();
  await page.getByRole("option", { name: "E2E Ankle Boots" }).click();
  await dialog.getByRole("button", { name: "Change type" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Changed the type of 2 items.",
  );
  const chelsea = page.getByRole("listitem").filter({ hasText: "E2E Chelsea" });
  await expect(chelsea).toContainText("E2E Ankle Boots · Shoes");

  // Merge the custom type into the built-in Boots
  await page.goto("/types");
  await page.getByRole("button", { name: "Merge E2E Ankle Boots" }).click();
  const merge = page.getByRole("dialog");
  await merge.getByLabel("Merge into").click();
  await page.getByRole("option", { name: "Boots", exact: true }).click();
  await merge.getByRole("button", { name: "Merge" }).click();
  await expect(merge).toHaveCount(0);
  await expect(page.getByText("E2E Ankle Boots")).toHaveCount(0);

  await page.goto("/");
  await expect(chelsea).toContainText("Boots · Shoes");
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Combat" }),
  ).toContainText("Boots · Shoes");
});
