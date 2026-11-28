import { test, expect, openItem, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-95: an item's details show its price over time.
test("price history shows the trend and the lowest price", async ({
  page,
  user,
}) => {
  const [coat] = await seedItems(user.id, [
    { title: "E2E History Coat", price: 200 },
  ]);
  await admin
    .from("items")
    .update({ link: "https://shop.example/coat" })
    .eq("id", coat.id);
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 86_400_000).toISOString();
  const rows = [
    [40, 200, null],
    [30, 200, 160],
    [20, 200, 140],
    [10, 200, null],
    [1, 200, 150],
  ] as const;
  const { error } = await admin.from("item_price_checks").insert(
    rows.map(([d, price, sale]) => ({
      item_id: coat.id,
      user_id: user.id,
      status: "ok",
      price,
      sale_price: sale,
      checked_at: daysAgo(d),
    })),
  );
  if (error) throw error;
  await page.reload();

  const sheet = await openItem(page, "E2E History Coat");
  const history = sheet.getByRole("region", { name: "Price history" });
  await expect(history).toBeVisible();
  await expect(
    history.getByText(/^Lowest \$140\.00 on .* · now \$150\.00\.$/),
  ).toBeVisible();
  await expect(history.getByRole("img")).toHaveAttribute(
    "aria-label",
    /Lowest \$140\.00, now \$150\.00/,
  );
});
