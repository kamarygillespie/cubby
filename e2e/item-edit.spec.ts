import {
  test,
  expect,
  expectNoHorizontalScroll,
  seedItems,
  seedWishlist,
} from "./fixtures";

test("edit an item, then delete it (and it leaves its wishlist)", async ({
  page,
  user,
}) => {
  const [item] = await seedItems(user.id, [
    { title: "E2E Trench Coat", price: 200 },
  ]);
  const listId = await seedWishlist(user.id, "E2E Gifts", [item.id]);
  await page.reload();

  // Edit from the card; the form starts from the saved values
  await page.getByRole("link", { name: "Edit E2E Trench Coat" }).click();
  await expect(page).toHaveURL(new RegExp(`/items/${item.id}/edit$`));
  await expect(page.getByText(/On E2E Gifts/)).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("E2E Trench Coat");
  await expect(page.getByLabel("Price", { exact: true })).toHaveValue("200");
  await expectNoHorizontalScroll(page);

  await page.getByLabel("Title").fill("E2E Trench Coat (camel)");
  await page.getByLabel("Sale price").fill("150");
  await page.getByLabel("Store / brand").fill("Aritzia");
  await page.getByRole("radio", { name: "5 stars" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/$/);
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Trench Coat (camel)" });
  await expect(card).toContainText("$150.00");
  await expect(card).toContainText("$200.00");
  await expect(card).toContainText("-25%");
  await expect(card).toContainText("Aritzia");

  // Validation: a blank title is rejected server-side too
  await card.getByRole("link", { name: /^Edit / }).click();
  await page.getByLabel("Title").fill("   ");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Title is required.",
  );

  // Delete, with a warning that names the wishlist it's on
  await page.getByRole("button", { name: "Delete item" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("removed from E2E Gifts");
  await dialog.getByRole("button", { name: "Delete item" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Trench Coat" }),
  ).toHaveCount(0);
  await page.goto(`/wishlists/${listId}`);
  await expect(page.getByText("0 items")).toBeVisible();
});

// A "soft" 404: with app/loading.tsx the page has already started streaming
// as 200 when notFound() runs, so Next serves the not-found UI plus a
// noindex tag rather than a 404 status (ARCHITECTURE.md, Rendering).
test("editing a missing or someone else's item shows not found", async ({
  page,
}) => {
  await page.goto("/items/00000000-0000-0000-0000-000000000000/edit");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]').first(),
  ).toBeAttached();
});
