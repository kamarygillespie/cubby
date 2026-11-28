import { test, expect, seedItems, seedWishlist } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-77: givers claim items so nobody doubles up; the owner doesn't see
// claims unless they turn on Show claims.
test("givers claim items on a shared list without spoiling the surprise", async ({
  page,
  user,
  browser,
}) => {
  const [boots, scarf] = await seedItems(user.id, [
    { title: "E2E Boots", price: 120 },
    { title: "E2E Scarf", price: 30 },
  ]);
  const listId = await seedWishlist(user.id, "E2E Holidays", [
    boots.id,
    scarf.id,
  ]);
  const { data } = await admin
    .from("wishlists")
    .select("share_token")
    .eq("id", listId)
    .single();
  const baseURL = new URL(page.url()).origin;
  const shareUrl = `${baseURL}/share/${data!.share_token}`;

  // Giver 1 claims the boots, with a name.
  const aunt = await (await browser.newContext()).newPage();
  await aunt.goto(shareUrl);
  await aunt.getByRole("button", { name: "I'm getting E2E Boots" }).click();
  await aunt.getByLabel(/your name/i).fill("Aunt May");
  await aunt.getByRole("button", { name: "Claim it" }).click();
  await expect(aunt.getByText("You're getting this")).toBeVisible();

  // Giver 2, on another device, sees it's taken and can't claim it.
  const friend = await (await browser.newContext()).newPage();
  await friend.goto(shareUrl);
  await expect(friend.getByText("Someone's getting this")).toBeVisible();
  await expect(
    friend.getByRole("button", { name: "I'm getting E2E Boots" }),
  ).toHaveCount(0);
  await expect(
    friend.getByRole("button", { name: "I'm getting E2E Scarf" }),
  ).toBeVisible();

  // The same browser remembers its claim and can undo it.
  await aunt.reload();
  await expect(aunt.getByText("You're getting this")).toBeVisible();
  await aunt.getByRole("button", { name: /Undo/ }).click();
  await expect(
    aunt.getByRole("button", { name: "I'm getting E2E Boots" }),
  ).toBeVisible();
  // ...and claims again for the owner check below.
  await aunt.getByRole("button", { name: "I'm getting E2E Boots" }).click();
  await aunt.getByLabel(/your name/i).fill("Aunt May");
  await aunt.getByRole("button", { name: "Claim it" }).click();
  await expect(aunt.getByText("You're getting this")).toBeVisible();

  // The owner's own preview shows no claims and no claim buttons.
  await page.goto(shareUrl);
  await expect(page.getByText("This is your list.")).toBeVisible();
  await expect(page.getByText("Claimed by a giver")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /I'm getting/ })).toHaveCount(
    0,
  );
  await page.goto(`/wishlists/${listId}`);
  await expect(page.getByText(/Claimed/)).toHaveCount(0);

  // Turning on Show claims reveals who's getting what.
  await page.goto("/wishlists");
  await page.getByRole("checkbox", { name: "Show claims" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Show claims" }),
  ).toBeChecked();
  // It's saved, not just shown checked.
  await expect(async () => {
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Show claims" }),
    ).toBeChecked({ timeout: 1000 });
  }).toPass();
  await page.goto(`/wishlists/${listId}`);
  await expect(page.getByText("Claimed by Aunt May")).toBeVisible();
  await page.goto(shareUrl);
  await expect(page.getByText("Claimed by a giver")).toBeVisible();
});
