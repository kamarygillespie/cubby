import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

const monthName = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

test("spending by month: columns, month details, table view", async ({
  page,
  user,
}) => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10, 12);
  const twoAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10, 12);
  const items = await seedItems(user.id, [
    { title: "E2E Boots", price: 200, sale_price: 150 },
    { title: "E2E Balm", price: 20 },
    { title: "E2E Coat", price: 300 },
  ]);
  const dates = [thisMonth, thisMonth, twoAgo];
  for (const [i, item] of items.entries()) {
    await admin.from("items").update({ purchased: true }).eq("id", item.id);
    // Set the date after the trigger stamps "now" on purchase.
    await admin
      .from("items")
      .update({ purchased_date: dates[i].toISOString() })
      .eq("id", item.id);
  }

  await page.goto("/?view=totals");
  await expect(
    page.getByRole("heading", { name: "Spending by month" }),
  ).toBeVisible();
  await expect(page.getByText("$470.00 in the last 12 months")).toBeVisible();

  // Each column is a labelled button; the latest month is selected
  const current = page.getByRole("button", {
    name: `${monthName(thisMonth)}: $170.00 on 2 items`,
  });
  await expect(current).toHaveAttribute("aria-pressed", "true");

  // Tap an older month to see its breakdown
  await page
    .getByRole("button", { name: `${monthName(twoAgo)}: $300.00 on 1 item` })
    .click();
  await expect(page.getByText("$300.00 on 1 item")).toBeVisible();
  await expect(page.getByText("E2E Coat")).toBeVisible();

  // Year switch
  await page.getByLabel("Time range").click();
  await page.getByRole("option", { name: String(now.getFullYear()) }).click();
  await expect(page.getByText(`in ${now.getFullYear()}`)).toBeVisible();

  // Table view
  await page.getByText("Show as table").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(monthName(thisMonth)) }),
  ).toContainText("$170.00");
});
