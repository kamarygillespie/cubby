import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-84: set a monthly budget on Totals and see this month's progress.
test("a monthly budget shows this month's spending against it", async ({
  page,
  user,
}) => {
  const [bag] = await seedItems(user.id, [
    { title: "E2E Budget Bag", price: 120 },
  ]);
  await admin.from("items").update({ purchased: true }).eq("id", bag.id);

  await page.goto("/?view=totals");
  await page.getByLabel("Monthly budget").fill("300");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  const month = new Date().toLocaleDateString("en-US", { month: "long" });
  await expect(page.getByText(`of $300.00 in ${month}`)).toBeVisible();
  await expect(page.getByText("$180.00 left this month")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Spent this month" }),
  ).toHaveAttribute("aria-valuenow", "40");
});
