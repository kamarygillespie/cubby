import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-54: a price check that drops a price creates an alert; the bell
// shows it, the list opens it, and alert settings save.
test("a price drop shows up under the bell and opens the item", async ({
  page,
  user,
}) => {
  const [boots] = await seedItems(user.id, [
    { title: "E2E Boots", price: 100 },
  ]);
  // What the daily price check does (as the service role).
  const { error } = await admin.rpc("record_price_check", {
    p_item_id: boots.id,
    p_price: 100,
    p_sale_price: 60,
  });
  expect(error).toBeNull();

  await page.goto("/");
  await page.getByRole("link", { name: "Notifications, 1 unread" }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  const alerts = page.getByRole("list", { name: "Alerts" });
  await expect(alerts).toContainText("E2E Boots dropped to $60.00 (new)");
  await expect(alerts).toContainText("Was $100.00 — 40% less.");

  await alerts.getByRole("link", { name: /E2E Boots dropped/ }).click();
  await expect(page).toHaveURL(new RegExp(`/items/${boots.id}/edit$`));

  await page.goto("/notifications");
  await expect(alerts).not.toContainText("(new)");
  await expect(page.getByRole("button", { name: "Mark all read" })).toHaveCount(
    0,
  );
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Notifications", exact: true }),
  ).toBeVisible();
});

test("alert settings save", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page.getByText("No alerts yet.")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Sales at my favorite stores" })
    .click();
  await page.getByLabel("When it drops at least").fill("25");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");

  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Sales at my favorite stores" }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Price drops on my wishlist" }),
  ).toBeChecked();
  await expect(page.getByLabel("When it drops at least")).toHaveValue("25");
});
