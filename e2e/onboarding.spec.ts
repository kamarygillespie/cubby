import { test, expect, seedItems } from "./fixtures";

// KAM-46: the "Get started" checklist for new accounts.
test("a new account gets a checklist that ticks off steps and can be hidden for good", async ({
  page,
  user,
}) => {
  await page.goto("/");
  const card = page.getByRole("region", { name: "Welcome to Cubby" });
  await expect(card).toContainText("0 of 4 done");
  await expect(
    card.getByRole("link", { name: /Add your first item/ }),
  ).toHaveAttribute("href", "/items/new");

  await seedItems(user.id, [{ title: "E2E First", price: 20 }]);
  await page.reload();
  await expect(card).toContainText("1 of 4 done");
  await expect(card.getByText("Add your first item (done)")).toBeAttached();

  await card.getByRole("button", { name: "Hide getting started" }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("E2E First")).toBeVisible();
  await expect(card).toHaveCount(0);
});
