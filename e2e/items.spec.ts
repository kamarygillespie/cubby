import {
  test,
  expect,
  expectNoHorizontalScroll,
  openItem,
  seedItems,
  seedWishlist,
} from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";
import { captureBookmarklet, captureScript } from "../src/lib/page-capture";

test("add an item manually", async ({ page }) => {
  await page.getByRole("link", { name: "Add item" }).click();
  await expect(page).toHaveURL(/\/items\/new/);

  await page.getByRole("button", { name: "Add without a link" }).click();
  await page.getByLabel("Title").fill("E2E Linen Shirt");
  await page.getByLabel("Item type").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Add details" }).click();
  await page.getByLabel("Price", { exact: true }).fill("80");
  await page.getByLabel("Sale price").fill("60");
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.getByLabel("Store / brand").fill("Everlane");
  await page.getByRole("button", { name: "Add item" }).click();

  await expect(page).toHaveURL(/\/$/);
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Linen Shirt" });
  await expect(card).toContainText("$60.00");
  await expect(card).toContainText("$80.00");
  await expect(card).toContainText("Everlane");
  // e2e emails are long (e2e-<uuid>@example.com), so this also guards the
  // header's email (shown from the sm breakpoint up) against overflow.
  await expectNoHorizontalScroll(page);
});

test("add an item from a pasted link", async ({ page }) => {
  await page.route("**/functions/v1/link-autofill", (route) =>
    route.fulfill({
      json: {
        title: "E2E Speedcat Sneakers",
        image: null,
        price: 73,
        salePrice: 49.99,
        store: "PUMA",
      },
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/items/new");

  // Only the link is asked for at first
  await expect(page.getByLabel("Title")).toHaveCount(0);
  await page.getByLabel("Product link").fill("us.puma.com/speedcat");
  await page.getByRole("button", { name: "Find details" }).click();

  // What was found is shown back, and only the type is still needed
  const preview = page.getByRole("region", { name: "Product found" });
  await expect(preview).toContainText("E2E Speedcat Sneakers");
  await expect(preview).toContainText("$49.99");
  await expect(preview).toContainText("PUMA");
  // Notes are ready to use without opening Add details
  await page.getByLabel("Notes").fill("Size 8, white");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(
    page.getByText("Choose what kind of item this is."),
  ).toBeVisible();

  // The likely type is offered, but only saved once it's confirmed
  await page.getByRole("button", { name: "Sneakers", exact: true }).click();
  await page.getByRole("button", { name: "Add item" }).click();

  await expect(page).toHaveURL(/\/$/);
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Speedcat Sneakers" });
  await expect(card).toContainText("$49.99");
  await expect(card).toContainText("Sneakers · Shoes · PUMA");
  const details = await openItem(page, "E2E Speedcat Sneakers");
  await expect(details).toContainText("Size 8, white");
});

test("a link Cubby can't read moves to manual entry and keeps the link", async ({
  page,
}) => {
  await page.route("**/functions/v1/link-autofill", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "nope" },
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/items/new");
  await page.getByLabel("Product link").fill("https://shop.example/a");
  await page.getByRole("button", { name: "Find details" }).click();

  await expect(page.getByText("couldn't read that page")).toBeVisible();
  await expect(page.getByLabel("Title")).toBeVisible();
  await page.getByRole("button", { name: "Add details" }).click();
  await expect(page.getByLabel("Link", { exact: true })).toHaveValue(
    "https://shop.example/a",
  );
});

test("a store that blocks Cubby is named, and its link is saved clean", async ({
  page,
}) => {
  await page.route("**/functions/v1/link-autofill", (route) =>
    route.fulfill({
      json: {
        title: null,
        image: null,
        price: null,
        salePrice: null,
        store: "H&M",
        category: null,
        blocked: true,
      },
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  await page.goto("/items/new");
  await page
    .getByLabel("Product link")
    .fill(
      "https://www2.hm.com/en_us/productpage.1.html?utm_source=google&gclid=x",
    );
  await page.getByRole("button", { name: "Find details" }).click();

  await expect(
    page.getByText("H&M doesn't let apps read its pages"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add details" }).click();
  await expect(page.getByLabel("Store / brand")).toHaveValue("H&M");
  await expect(page.getByLabel("Link", { exact: true })).toHaveValue(
    "https://www2.hm.com/en_us/productpage.1.html",
  );
});

test("Save to Cubby adds a product from the open page, then updates its price", async ({
  page,
  baseURL,
}) => {
  const product = (price: string) => `<!doctype html><html><head>
    <title>Linen Shirt | Blocked Store</title>
    <link rel="canonical" href="https://blocked-store.example/p/linen-shirt" />
    <script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "E2E Linen Shirt",
      image: "https://blocked-store.example/shirt.png",
      brand: { name: "Blocked Store" },
      offers: { "@type": "Offer", price },
    })}</script></head><body><h1>Linen Shirt</h1></body></html>`;

  let price = "40.00";
  await page.route("https://blocked-store.example/p/**", (route) =>
    route.fulfill({ contentType: "text/html", body: product(price) }),
  );
  await page.route("https://blocked-store.example/shirt.png", (route) =>
    route.fulfill({ status: 403, body: "" }),
  );
  await page.route("**/functions/v1/link-autofill", (route) =>
    route.fulfill({
      json: { image: null },
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  const saveFromPage = async () => {
    await page.goto(
      "https://blocked-store.example/p/linen-shirt?utm_source=ad",
    );
    await page.evaluate(captureScript(baseURL!));
    await page.waitForURL(/\/items\/new\?capture=/);
  };

  // First save: the page's details are ready to confirm
  await saveFromPage();
  const preview = page.getByRole("region", { name: "Product found" });
  await expect(preview).toContainText("E2E Linen Shirt");
  await expect(preview).toContainText("$40.00");
  await expect(preview).toContainText("Blocked Store");
  await expect(page.getByText("won't let Cubby keep its photo")).toBeVisible();
  await page.getByRole("button", { name: "Something else" }).click();
  await page.getByLabel("Item type").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Saving it again offers the new price instead of a duplicate
  price = "32.00";
  await saveFromPage();
  await expect(
    page.getByRole("heading", { name: "Already in your Cubby" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Update price" }).click();
  await expect(page).toHaveURL(/\/$/);
  const cards = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Linen Shirt" });
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("$32.00");
});

test("the Save to Cubby bookmark opens a new tab and leaves the store open", async ({
  page,
  context,
  baseURL,
}) => {
  const storeUrl = "https://any-store.example/p/scarf";
  await page.route(storeUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(
        {
          "@type": "Product",
          name: "E2E Wool Scarf",
          offers: { "@type": "Offer", price: "45.00" },
        },
      )}</script></head><body><h1>Scarf</h1></body></html>`,
    }),
  );
  await page.goto(storeUrl);

  const script = decodeURIComponent(
    captureBookmarklet(baseURL!).replace(/^javascript:/, ""),
  );
  const [cubbyTab] = await Promise.all([
    context.waitForEvent("page"),
    page.evaluate(script),
  ]);

  await cubbyTab.waitForURL(/\/items\/new\?capture=/);
  await expect(
    cubbyTab.getByRole("region", { name: "Product found" }),
  ).toContainText("E2E Wool Scarf");
  await expect(page).toHaveURL(storeUrl);
  await expect(page.getByRole("heading", { name: "Scarf" })).toBeVisible();
  expect(await cubbyTab.evaluate(() => window.opener)).toBeNull();
});

test("Save to Cubby uses a store's US price when its data is in pounds", async ({
  page,
  baseURL,
}) => {
  await page.route("https://uk-store.example/p/sweater", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head>
        <meta property="product:price:amount" content="39.68" />
        <meta property="product:price:currency" content="GBP" />
        <script type="application/ld+json">${JSON.stringify({
          "@type": "Product",
          name: "E2E Chunky Sweater",
          offers: [{ "@type": "Offer", priceCurrency: "USD", price: 31.74 }],
        })}</script></head><body><script>
        self.d={"currency_code":"GBP","marketing":{"sale_price_usd":41.93},
        "discount_price_list":[{"type":0,"sale_price":31.74}]};
        </script></body></html>`,
    }),
  );
  await page.goto("https://uk-store.example/p/sweater");
  await page.evaluate(captureScript(baseURL!));
  await page.waitForURL(/\/items\/new\?capture=/);

  const preview = page.getByRole("region", { name: "Product found" });
  await expect(preview).toContainText("$41.93");
  await expect(preview).toContainText("$52.42");
});

test("mark an item purchased, then gifted", async ({ page, user }) => {
  await seedItems(user.id, [{ title: "E2E Boots", price: 200 }]);
  await page.reload();

  const card = () =>
    page.getByRole("listitem").filter({ hasText: "E2E Boots" });

  let sheet = await openItem(page, "E2E Boots");
  await sheet.getByRole("button", { name: "Mark purchased" }).click();
  await expect(sheet).toHaveCount(0); // saved; the sheet has closed
  await expect(card()).toHaveCount(0); // leaves the Wishlist tab

  await page.getByRole("button", { name: "Purchased", exact: true }).click();
  await expect(card()).toBeVisible();
  sheet = await openItem(page, "E2E Boots");
  await expect(
    sheet.getByRole("button", { name: "Purchased", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  await page.getByRole("button", { name: "Totals", exact: true }).click();
  await expect(page.getByText("$200.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Gifted", exact: true }).click();
  await expect(card()).toHaveCount(0);
  await page.getByRole("button", { name: "Purchased", exact: true }).click();
  sheet = await openItem(page, "E2E Boots");
  await sheet.getByRole("button", { name: "Mark gifted" }).click();
  await expect(sheet).toHaveCount(0);
  await page.getByRole("button", { name: "Gifted", exact: true }).click();
  await expect(card()).toBeVisible();
});

test("delete an item from its details and stay on the same tab", async ({
  page,
  user,
}) => {
  const [item] = await seedItems(user.id, [
    { title: "E2E Old Boots", price: 90 },
    { title: "E2E Keep Boots", price: 80 },
  ]);
  await admin
    .from("items")
    .update({ purchased: true })
    .in("title", ["E2E Old Boots", "E2E Keep Boots"]);
  await seedWishlist(user.id, "E2E Gifts", [item.id]);
  await page.goto("/?view=purchased");

  const sheet = await openItem(page, "E2E Old Boots");
  await sheet.getByRole("button", { name: "Delete item" }).click();
  const confirm = page.getByRole("dialog", { name: /Delete/ });
  await expect(confirm).toContainText("removed from E2E Gifts");

  // Cancel keeps the item
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);
  await sheet.getByRole("button", { name: "Delete item" }).click();
  await confirm.getByRole("button", { name: "Delete item" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Old Boots" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: "E2E Keep Boots" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/view=purchased/);
  await expectNoHorizontalScroll(page);
});

test("filter from the toolbar, then remove the filter with its chip", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [
    { title: "E2E Sale Coat", price: 100, sale_price: 60 },
    { title: "E2E Full Price Scarf", price: 40 },
  ]);
  await page.reload();
  const cards = page.getByRole("listitem").filter({ hasText: /E2E / });
  await expect(cards).toHaveCount(2);

  await page.getByRole("button", { name: /^Filter/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "On sale" }).click();
  await expect(page).toHaveURL(/onSale=1/);
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("E2E Sale Coat");

  await page.getByRole("button", { name: "Remove On sale filter" }).click();
  await expect(cards).toHaveCount(2);
  await expectNoHorizontalScroll(page);
});
