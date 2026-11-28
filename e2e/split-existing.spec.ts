import {
  test,
  expect,
  seedItems,
  seedWishlist,
  startSelecting,
} from "./fixtures";

// KAM-103: find new items (not on a list) and split them into two lists
// that already exist, keeping the totals even.
test("split new finds into existing Christmas lists", async ({
  page,
  user,
}) => {
  const [mom, bf] = await seedItems(user.id, [
    { title: "E2E Already Mom", price: 100 },
    { title: "E2E Already BF", price: 60 },
  ]);
  await seedWishlist(user.id, "E2E My Family", [mom.id]);
  await seedWishlist(user.id, "E2E His Family", [bf.id]);
  await seedItems(user.id, [
    { title: "E2E New Scarf", price: 30 },
    { title: "E2E New Mug", price: 20 },
    { title: "E2E New Socks", price: 10 },
  ]);
  await page.reload();

  // Only what isn't on a list yet.
  await page
    .getByRole("button", { name: /filter/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Not on a list (3)" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("E2E Already Mom")).toHaveCount(0);
  await expect(page.getByText("E2E New Scarf")).toBeVisible();

  await startSelecting(page);
  await page.getByRole("button", { name: "Select all" }).click();
  await page
    .getByRole("button", { name: "Split selected items evenly into lists" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("radio", { name: "Lists I have" }),
  ).toBeChecked();
  await dialog.getByRole("checkbox", { name: /E2E My Family/ }).click();
  await dialog.getByRole("checkbox", { name: /E2E His Family/ }).click();
  // The $60 list catches up: both end at $110.
  await expect(dialog).toContainText("$60.00 → $110.00");
  await expect(dialog).toContainText("$100.00 → $110.00");
  await dialog.getByRole("button", { name: "Add to 2 lists" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Split 3 items into",
  );

  // Nothing left to place.
  await page.reload();
  await expect(page.getByText("E2E New Scarf")).toHaveCount(0);
  await page.goto("/wishlists");
  await expect(page.getByText("2 items · $110.00")).toBeVisible();
  await expect(page.getByText("3 items · $110.00")).toBeVisible();
});
