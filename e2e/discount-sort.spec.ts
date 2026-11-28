import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-96: biggest discount first, and hide sold-out items.
test("sort by biggest discount and hide sold out", async ({ page, user }) => {
  const [, , soldOut] = await seedItems(user.id, [
    { title: "E2E Ten Off", price: 100, sale_price: 90 },
    { title: "E2E Forty Off", price: 50, sale_price: 30 },
    { title: "E2E Sold Out", price: 80 },
  ]);
  await admin.from("items").update({ in_stock: false }).eq("id", soldOut.id);
  await page.reload();

  await page
    .getByRole("button", { name: /filter/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Biggest discount" }).click();
  await page.keyboard.press("Escape");
  const cards = page.getByRole("listitem").filter({ hasText: /E2E / });
  await expect(cards.nth(0)).toContainText("E2E Forty Off");
  await expect(cards.nth(1)).toContainText("E2E Ten Off");

  await page
    .getByRole("button", { name: /filter/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Hide sold out" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("E2E Sold Out")).toHaveCount(0);
  await expect(page.getByText("E2E Ten Off")).toBeVisible();
});
