import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// An item deleted elsewhere (another tab) while its card is still on screen:
// Mark purchased just refreshes the list instead of erroring.
test("marking a deleted item purchased drops its card", async ({
  page,
  user,
}) => {
  const [item] = await seedItems(user.id, [{ title: "E2E Gone", price: 5 }]);
  await page.goto("/");
  const card = page.getByRole("listitem").filter({ hasText: "E2E Gone" });
  await expect(card).toBeVisible();

  await admin.from("items").delete().eq("id", item.id);
  await card.getByRole("button", { name: "Mark purchased" }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});
