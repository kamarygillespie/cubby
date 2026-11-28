import { test, expect, seedItems, startSelecting } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-94: Check price in Select mode checks only the selected items.
test("check prices of just the selected items", async ({ page, user }) => {
  const [a, b] = await seedItems(user.id, [
    { title: "E2E Check A", price: 20 },
    { title: "E2E Check B", price: 30 },
    { title: "E2E Check C", price: 40 },
  ]);
  await admin
    .from("items")
    .update({ link: "https://shop.example/a" })
    .eq("id", a.id);
  await admin
    .from("items")
    .update({ link: "https://other.example/b" })
    .eq("id", b.id);
  await page.reload();

  await startSelecting(page);
  // C has no link, so only A and B can be checked.
  for (const t of ["E2E Check A", "E2E Check B", "E2E Check C"]) {
    await page.getByRole("checkbox", { name: `Select ${t}` }).click();
  }
  await page
    .getByRole("button", { name: "Check price of 2 selected items" })
    .click();

  // Local tests don't run the Edge Function, so pages can't be read; the
  // count still shows exactly the two selected, linked items were checked.
  await expect(page.getByRole("status").first()).toHaveText(
    "Checked. 2 couldn't be read.",
    { timeout: 20_000 },
  );
  // Select mode closed; tab and items still there.
  await expect(
    page.getByRole("checkbox", { name: "Select E2E Check A" }),
  ).toHaveCount(0);
});

test("the Select bar fits on a 320px phone", async ({ page, user }, info) => {
  test.skip(info.project.name !== "phone");
  const [item] = await seedItems(user.id, [{ title: "E2E Fit", price: 10 }]);
  await admin
    .from("items")
    .update({ link: "https://shop.example/x" })
    .eq("id", item.id);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();
  await startSelecting(page);
  await page.getByRole("checkbox", { name: "Select E2E Fit" }).click();
  for (const name of [
    /^Split/,
    /^Change type/,
    /^Check price/,
    /^Delete selected/,
    /^Add to wishlist/,
  ]) {
    const box = (await page
      .getByRole("button", { name })
      .last()
      .boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
});
