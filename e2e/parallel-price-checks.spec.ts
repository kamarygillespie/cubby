import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-99: Check all prices really runs several stores at once in the
// browser (Server Actions would have been queued one at a time), and never
// two from the same store at once.
test("Check all prices runs stores in parallel, one per store", async ({
  page,
  user,
}) => {
  const hosts = ["a", "b", "c", "d", "e", "a"].map(
    (h) => `https://${h}.example/p`,
  );
  const items = await seedItems(
    user.id,
    hosts.map((_, i) => ({ title: `E2E Parallel ${i}`, price: 10 + i })),
  );
  for (const [i, item] of items.entries()) {
    await admin.from("items").update({ link: hosts[i] }).eq("id", item.id);
  }
  const hostOf = new Map(items.map((it, i) => [it.id, hosts[i]]));

  let inFlight = 0;
  let peak = 0;
  const perHost = new Map<string, number>();
  let sameHostOverlap = false;
  await page.route("**/api/check-price", async (route) => {
    const { itemId } = route.request().postDataJSON() as { itemId: string };
    const host = hostOf.get(itemId) ?? "?";
    inFlight++;
    peak = Math.max(peak, inFlight);
    perHost.set(host, (perHost.get(host) ?? 0) + 1);
    if (perHost.get(host)! > 1) sameHostOverlap = true;
    await new Promise((r) => setTimeout(r, 1500));
    perHost.set(host, perHost.get(host)! - 1);
    inFlight--;
    await route.fulfill({
      json: { outcome: "unchanged", message: "No change." },
    });
  });
  await page.reload();

  const started = Date.now();
  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("button", { name: "Check all prices" }).click();
  await expect(page.getByText(/at once/)).toBeVisible();
  await expect(page.getByRole("status").first()).toHaveText(
    "Checked. 6 unchanged.",
    { timeout: 20_000 },
  );
  const elapsed = Date.now() - started;

  expect(peak).toBeGreaterThanOrEqual(5); // 5 different stores together
  expect(sameHostOverlap).toBe(false);
  // One at a time would take 6 × 1.5s = 9s or more.
  expect(elapsed).toBeLessThan(7_000);
});
