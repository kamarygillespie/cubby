import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-82: older, lukewarm items get a "Still want these?" check-in.
test("check in on old items: archive, restore and keep", async ({
  page,
  user,
}) => {
  const [lamp, vase] = await seedItems(user.id, [
    { title: "E2E Lukewarm Lamp", price: 80 },
    { title: "E2E Lukewarm Vase", price: 40 },
  ]);
  const longAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await admin
    .from("items")
    .update({ created_at: longAgo, interest_level: 2 })
    .in("id", [lamp.id, vase.id]);
  await page.reload();

  await page.getByRole("link", { name: /Still want these\? 2 items/ }).click();
  const review = page.getByRole("list", { name: "To review" });
  await review
    .getByRole("button", { name: "Archive E2E Lukewarm Lamp" })
    .click();
  // Each row stays in place and says what happened.
  await expect(review.getByText("Archived")).toBeVisible();
  await review.getByRole("button", { name: "Keep E2E Lukewarm Vase" }).click();
  await expect(review.getByText("Kept")).toBeVisible();

  // Archived items leave the wishlist; kept ones stay and aren't asked again.
  await page.goto("/");
  await expect(page.getByText("E2E Lukewarm Lamp")).toHaveCount(0);
  await expect(page.getByText("E2E Lukewarm Vase")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Still want these\?/ }),
  ).toHaveCount(0);

  await page.goto("/check-in");
  await page
    .getByRole("list", { name: "Archived" })
    .getByRole("button", { name: "Restore E2E Lukewarm Lamp" })
    .click();
  await expect(page.getByText("Back on your wishlist")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("E2E Lukewarm Lamp")).toBeVisible();
});
