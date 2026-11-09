import { test, expect, seedItems } from "./fixtures";

test("long wishlists render 50 cards at a time; totals stay complete", async ({
  page,
  user,
}) => {
  await seedItems(
    user.id,
    Array.from({ length: 60 }, (_, i) => ({
      title: `E2E Bulk ${String(i + 1).padStart(2, "0")}`,
      price: 10,
    })),
  );
  await page.reload();

  const cards = page.getByRole("listitem").filter({ hasText: "E2E Bulk" });
  await expect(cards).toHaveCount(50);

  // Grouped view: the header still counts and totals all 60
  await page.goto("/?group=category");
  await expect(page.getByText("60 items · $600.00")).toBeVisible();
  await expect(cards).toHaveCount(50);

  await page.getByRole("link", { name: "Show 10 more (10 not shown)" }).click();
  await expect(cards).toHaveCount(60);
  await expect(page).toHaveURL(/group=category/); // other params survive
  await expect(page.getByRole("link", { name: /more/ })).toHaveCount(0);
});
