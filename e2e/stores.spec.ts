import { test, expect, seedItems } from "./fixtures";

test("stores show sales; favorites float up, get a sale link, and filter the wishlist", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [
    { title: "E2E Hoops", price: 65, sale_price: 52, store_brand: "Mejuri" },
    { title: "E2E Chain", price: 120, store_brand: "mejuri" },
    { title: "E2E Coat", price: 300, store_brand: "Aritzia" },
    { title: "E2E Tee", price: 30, store_brand: "Everlane" },
  ]);

  await page.goto("/stores");
  const row = (name: string) =>
    page.getByRole("listitem").filter({ hasText: name });
  await expect(row("Mejuri")).toContainText("2 items · $172.00");
  await expect(row("Mejuri")).toContainText("1 on sale · up to 20% off");
  await expect(page.getByText("1 running a sale")).toBeVisible();

  // Star Everlane: it moves to the top
  await page.getByRole("button", { name: "Favorite Everlane" }).click();
  await expect(
    page.getByRole("button", { name: "Unfavorite Everlane" }),
  ).toBeVisible();
  await expect(page.getByRole("listitem").first()).toContainText("Everlane");

  // Sale page link (bad link rejected first)
  await row("Everlane")
    .getByRole("button", { name: "Add sale page link" })
    .click();
  await page.getByLabel("Everlane sale page link").fill("ftp://nope");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(row("Everlane").getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Everlane sale page link")
    .fill("https://www.everlane.com/sale");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    row("Everlane").getByRole("link", { name: "Sale page" }),
  ).toHaveAttribute("href", "https://www.everlane.com/sale");

  // "View items" filters the wishlist to that store
  await row("Mejuri").getByRole("link", { name: "View items" }).click();
  const cards = page.getByRole("listitem").filter({ hasText: /E2E / });
  await expect(cards).toHaveCount(2);
  await page.getByRole("button", { name: /Remove store filter/ }).click();
  await expect(cards).toHaveCount(4);

  // Favorite stores toggle
  await page.getByRole("button", { name: "Favorite stores" }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("E2E Tee");
});
