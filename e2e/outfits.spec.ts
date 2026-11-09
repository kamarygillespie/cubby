import { test, expect, seedItems } from "./fixtures";

test("build an outfit from closet pieces, edit it, then delete it", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [
    { title: "E2E Jeans", source: "closet" },
    { title: "E2E Tee", source: "closet" },
    { title: "E2E Blazer", source: "closet" },
    { title: "E2E Wish", price: 50 }, // a wishlist item: not offered
  ]);

  await page.goto("/closet");
  await page.getByRole("link", { name: "Outfits" }).click();
  await page.getByRole("link", { name: "New outfit" }).click();

  await expect(page.getByRole("checkbox", { name: "E2E Wish" })).toHaveCount(0);
  await page.getByLabel("Name").fill("E2E Friday");
  await page.getByRole("checkbox", { name: "E2E Jeans" }).click();
  await page.getByRole("checkbox", { name: "E2E Tee" }).click();
  await expect(page.getByText("(2 picked)")).toBeVisible();
  await page.getByRole("button", { name: "Save outfit" }).click();

  // The board
  await expect(page).toHaveURL(/\/outfits\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "E2E Friday" })).toBeVisible();
  const board = page.getByRole("listitem").filter({ hasText: /E2E / });
  await expect(board).toHaveCount(2);

  // From a piece, see which outfits use it
  await board.filter({ hasText: "E2E Jeans" }).getByRole("link").click();
  await expect(page.getByText("In outfits:")).toBeVisible();
  await expect(page.getByRole("link", { name: "E2E Friday" })).toBeVisible();
  await page.getByRole("link", { name: "E2E Friday" }).click();

  // Swap pieces
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("checkbox", { name: "E2E Jeans" }).click();
  await page.getByRole("checkbox", { name: "E2E Blazer" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "E2E Friday" })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Jeans" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Blazer" }),
  ).toHaveCount(1);

  // Delete
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Delete outfit" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete outfit" })
    .click();
  await expect(page).toHaveURL(/\/outfits$/);
  await expect(page.getByText("No outfits yet.")).toBeVisible();
});
