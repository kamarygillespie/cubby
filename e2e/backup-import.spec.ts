import { test, expect, seedItems } from "./fixtures";

// KAM-87: download a CSV backup; import items from another spreadsheet.
test("download a backup and import items from a CSV", async ({
  page,
  user,
}) => {
  await seedItems(user.id, [{ title: "E2E Backup Lamp", price: 80 }]);

  // Export: the signed-in user's items as CSV.
  const res = await page.request.get("/api/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv).toContain("Title,Status,Item type");
  expect(csv).toContain("E2E Backup Lamp,Wishlist");

  // Import: a spreadsheet with its own column names and one bad row.
  await page.goto("/data");
  await page.getByLabel("CSV file").setInputFiles({
    name: "my-list.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Product,Cost,Brand,Status",
        "E2E Import Candle,$38,Boy Smells,want",
        "E2E Import Scarf,45,Quince,bought",
        ",10,Nobody,want",
      ].join("\n"),
    ),
  });
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview).toContainText("2 items ready, 1 with problems");
  await expect(preview).toContainText("Row 4: No title");
  await expect(page.getByLabel("Title")).toHaveValue("0");

  await page.getByRole("button", { name: "Import 2 items" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Added 2 items, skipped 1 with problems.",
  );

  await page.goto("/");
  await expect(page.getByText("E2E Import Candle")).toBeVisible();
  await page.goto("/?view=purchased");
  await expect(page.getByText("E2E Import Scarf")).toBeVisible();
});
