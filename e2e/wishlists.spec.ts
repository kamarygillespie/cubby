import { test, expect, seedItems } from "./fixtures";

test("create a wishlist from selected items and open its public share link", async ({
  page,
  user,
  browser,
}) => {
  await seedItems(user.id, [
    { title: "E2E Sweater", price: 120, sale_price: 90 },
    { title: "E2E Earrings", price: 40 },
    { title: "E2E Not Shared", price: 10 },
  ]);
  await page.reload();

  // Multi-select → add to a new list
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: "Select E2E Sweater" }).click();
  await page.getByRole("checkbox", { name: "Select E2E Earrings" }).click();
  await page.getByRole("button", { name: "Add to wishlist" }).click();
  await page.getByLabel(/new list/i).fill("E2E Birthday");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Added 2 items to 1 list.");

  // Item cards now show which list they're on
  const sweater = page.getByRole("listitem").filter({ hasText: "E2E Sweater" });
  await expect(
    sweater.getByRole("link", { name: "E2E Birthday" }),
  ).toBeVisible();

  // Manage the list and grab its share link
  await sweater.getByRole("link", { name: "E2E Birthday" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E Birthday" }),
  ).toBeVisible();
  await expect(page.getByText("2 items · $130.00")).toBeVisible();
  const shareHref = await page
    .getByRole("link", { name: "Preview" })
    .getAttribute("href");
  expect(shareHref).toMatch(/^\/share\/[0-9a-f-]{36}$/);

  // A signed-out visitor can open it
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  const baseURL = new URL(page.url()).origin;
  const response = await visitorPage.goto(`${baseURL}${shareHref}`);
  expect(response?.status()).toBe(200);
  await expect(
    visitorPage.getByRole("heading", { name: "E2E Birthday" }),
  ).toBeVisible();
  await expect(visitorPage.getByText("E2E Sweater")).toBeVisible();
  await expect(visitorPage.getByText("E2E Earrings")).toBeVisible();
  await expect(visitorPage.getByText("E2E Not Shared")).toHaveCount(0);

  // Purchased items drop off the public page
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ hasText: "E2E Earrings" })
    .getByRole("button", { name: "Mark purchased" })
    .click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Earrings" }),
  ).toHaveCount(0);
  await visitorPage.reload();
  await expect(visitorPage.getByText("E2E Sweater")).toBeVisible();
  await expect(visitorPage.getByText("E2E Earrings")).toHaveCount(0);

  await visitor.close();
});
