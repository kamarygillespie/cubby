import { test, expect, seedItems } from "./fixtures";
import { admin } from "../src/lib/db/integration-test-utils";

// KAM-85: log wears from the closet and from an outfit; cost per wear.
test("log wears, see cost per wear, sort and wear an outfit", async ({
  page,
  user,
}) => {
  const [coat, scarf] = await seedItems(user.id, [
    { title: "E2E Wear Coat", price: 120 },
    { title: "E2E Wear Scarf", price: 30 },
  ]);
  await admin
    .from("items")
    .update({ purchased: true })
    .in("id", [coat.id, scarf.id]);

  await page.goto("/closet");
  const coatCard = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Wear Coat" });
  await expect(coatCard.getByText("Not worn yet")).toBeVisible();
  await coatCard
    .getByRole("button", { name: "Wore E2E Wear Coat today" })
    .click();
  await expect(coatCard.getByText("Worn once · $120.00/wear")).toBeVisible();
  await coatCard
    .getByRole("button", { name: "Wore E2E Wear Coat today" })
    .click();
  await expect(coatCard.getByText("Worn 2× · $60.00/wear")).toBeVisible();
  await coatCard
    .getByRole("button", { name: "Undo last wear of E2E Wear Coat" })
    .click();
  await expect(coatCard.getByText("Worn once · $120.00/wear")).toBeVisible();

  // Most worn first.
  await page.getByRole("link", { name: "Most worn" }).click();
  await expect(page.getByRole("listitem").first()).toContainText(
    "E2E Wear Coat",
  );

  // An outfit logs a wear for each piece.
  const { data: outfit } = await admin
    .from("outfits")
    .insert({ user_id: user.id, name: "E2E Cozy" })
    .select("id")
    .single();
  await admin.from("outfit_items").insert([
    { outfit_id: outfit!.id, item_id: coat.id },
    { outfit_id: outfit!.id, item_id: scarf.id },
  ]);
  await page.goto(`/outfits/${outfit!.id}`);
  await page.getByRole("button", { name: "Wore this outfit" }).click();
  await expect(page.getByText("Logged a wear for 2 pieces.")).toBeVisible();

  await page.goto("/closet");
  await expect(coatCard.getByText("Worn 2× · $60.00/wear")).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "E2E Wear Scarf" })
      .getByText("Worn once · $30.00/wear"),
  ).toBeVisible();
});
