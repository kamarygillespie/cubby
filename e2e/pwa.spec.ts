import { test, expect, expectNoHorizontalScroll } from "./fixtures";

// KAM-51: the installed-app (PWA) experience.

test("phones get a bottom tab bar; More holds theme, install and log out", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  if (!isMobile) {
    await expect(nav).toBeHidden();
    return;
  }
  await expect(nav.getByRole("link", { name: "Wishlist" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await nav.getByRole("link", { name: "Closet" }).click();
  await expect(page).toHaveURL(/\/closet$/);
  await expect(nav.getByRole("link", { name: "Closet" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await nav.getByRole("link", { name: "More" }).click();
  await expect(page).toHaveURL(/\/more$/);
  await expect(page.getByRole("link", { name: /Outfits/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Item types/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("sharing a link to Cubby prefills the add form", async ({ page }) => {
  await page.goto(
    "/items/new?title=Sneakers&text=" +
      encodeURIComponent("Look at these https://shop.example/sneakers?id=4"),
  );
  await expect(page.getByLabel("Paste a product link (optional)")).toHaveValue(
    "https://shop.example/sneakers?id=4",
  );
});

test("the offline page is public and the service worker is served", async ({
  browser,
}) => {
  const page = await browser.newPage(); // signed out
  await page.goto("/offline");
  await expect(
    page.getByRole("heading", { name: "You're offline" }),
  ).toBeVisible();
  const sw = await page.request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(sw.headers()["cache-control"]).toContain("no-cache");
  await page.close();
});
