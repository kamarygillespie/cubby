import { test, expect, openItem, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-83: a return window on a purchased item, then Mark returned.
test("set a return window, then mark the item returned", async ({
  page,
  user,
}) => {
  const [jeans] = await seedItems(user.id, [
    { title: "E2E Return Jeans", price: 98 },
  ]);
  await admin.from("items").update({ purchased: true }).eq("id", jeans.id);

  await page.goto("/?view=purchased");
  let sheet = await openItem(page, "E2E Return Jeans");
  await sheet.getByRole("button", { name: "30 days" }).click();
  await expect(sheet.getByRole("status").last()).toContainText(
    "You'll get a reminder 3 days before.",
  );
  await page.keyboard.press("Escape");
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Return Jeans" });
  await expect(card.getByText(/^Return by /)).toBeVisible();

  sheet = await openItem(page, "E2E Return Jeans");
  await sheet
    .getByRole("button", { name: "Mark E2E Return Jeans returned" })
    .click();
  await expect(card).toHaveCount(0);

  await page.goto("/");
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Return Jeans" }),
  ).toBeVisible();
  const { data } = await admin
    .from("items")
    .select("purchased, return_by")
    .eq("id", jeans.id)
    .single();
  expect(data).toEqual({ purchased: false, return_by: null });
});
