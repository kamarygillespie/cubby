import { test, expect, seedItems, seedWishlist } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-79: a list's occasion date shows as a countdown to givers.
test("an occasion date shows a countdown on the share page", async ({
  page,
  user,
  browser,
}) => {
  const [item] = await seedItems(user.id, [
    { title: "E2E Occasion Mug", price: 20 },
  ]);
  const listId = await seedWishlist(user.id, "E2E Birthday", [item.id]);
  const inTenDays = new Date();
  inTenDays.setDate(inTenDays.getDate() + 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${inTenDays.getFullYear()}-${pad(inTenDays.getMonth() + 1)}-${pad(inTenDays.getDate())}`;

  await page.goto(`/wishlists/${listId}`);
  await page.getByLabel("Occasion date").fill(date);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Date saved.")).toBeVisible();

  await page.goto("/wishlists");
  await expect(page.getByText(/· 10 days to go/)).toBeVisible();

  const { data } = await admin
    .from("wishlists")
    .select("share_token")
    .eq("id", listId)
    .single();
  const giver = await (await browser.newContext()).newPage();
  await giver.goto(`${new URL(page.url()).origin}/share/${data!.share_token}`);
  await expect(giver.getByText(/10 days to go/)).toBeVisible();
});
