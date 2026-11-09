import { test, expect, seedItems } from "./fixtures";

test("purchases land in the closet; owned pieces join without touching totals", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [{ title: "E2E Trench", price: 200 }]);
  await page.reload();

  // Buying something puts it in the closet
  await page
    .getByRole("listitem")
    .filter({ hasText: "E2E Trench" })
    .getByRole("button", { name: "Mark purchased" })
    .click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Trench" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Closet" }).click();
  await expect(page).toHaveURL(/\/closet$/);
  const trench = page.getByRole("listitem").filter({ hasText: "E2E Trench" });
  await expect(trench).toContainText("Bought");

  // Add a piece you already own: no price fields
  await page.getByRole("link", { name: "Add a piece" }).click();
  await expect(page.getByLabel("Price", { exact: true })).toHaveCount(0);
  await page.getByLabel("Title").fill("E2E Old Jeans");
  await page.getByLabel("Item type").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Add to closet" }).click();
  await expect(page).toHaveURL(/\/closet$/);
  const jeans = page.getByRole("listitem").filter({ hasText: "E2E Old Jeans" });
  await expect(jeans).toContainText("Added");
  await expect(page.getByText("2 pieces")).toBeVisible();

  // Editing from the closet returns to the closet
  await jeans.getByRole("link").click();
  await expect(page.getByRole("link", { name: "Closet" })).toBeVisible();
  await page.getByLabel("Title").fill("E2E Old Jeans (black)");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/closet$/);
  await expect(page.getByText("E2E Old Jeans (black)")).toBeVisible();

  // The owned piece never shows up in wishlist tabs or spending
  await page.goto("/?view=purchased");
  await expect(page.getByText("E2E Old Jeans")).toHaveCount(0);
  await page.goto("/?view=totals");
  await expect(page.getByText("$200.00").first()).toBeVisible();
});
