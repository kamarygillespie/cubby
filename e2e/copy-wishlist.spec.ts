import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-91: copy the wishlist as text, ready to paste into an AI chat.
test("copy the wishlist as text, notes only when asked", async ({
  page,
  user,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const [boots] = await seedItems(user.id, [
    { title: "E2E Copy Boots", price: 120, store_brand: "Madewell" },
    { title: "E2E Copy Candle", price: 38, store_brand: "Boy Smells" },
  ]);
  await admin
    .from("items")
    .update({ notes: "E2E private note" })
    .eq("id", boots.id);
  await page.reload();

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Copy wishlist" }).click();
  const dialog = page.getByRole("dialog");
  const text = dialog.getByRole("textbox", { name: "Wishlist text" });
  await expect(text).toHaveValue(/Suggest 10 things/);
  await expect(text).toHaveValue(/E2E Copy Boots \| Madewell \| \$120\.00/);
  await expect(text).not.toHaveValue(/E2E private note/);

  // KAM-93: a price range for the ideas.
  await dialog.getByRole("button", { name: "$30 to $100" }).click();
  await expect(text).toHaveValue(
    /aren't on it, priced between \$30 and \$100\./,
  );
  await dialog.getByRole("button", { name: "Under $30" }).click();
  await expect(text).toHaveValue(/aren't on it, priced under \$100\./);

  await dialog.getByRole("checkbox", { name: "Include my notes" }).click();
  await expect(text).toHaveValue(/Notes: E2E private note/);

  await dialog.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Copied 2 items.");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("E2E Copy Candle | Boy Smells | $38.00");
  expect(copied).toContain("Notes: E2E private note");
});
