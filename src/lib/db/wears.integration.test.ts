import { beforeAll, describe, expect, test } from "vitest";
import { listItemTypes } from "./item-types";
import { createItem } from "./items";
import {
  listWearCounts,
  logOutfitWear,
  logWear,
  undoOutfitWear,
  undoWear,
} from "./wears";
import { admin, createTestUser } from "./integration-test-utils";

// KAM-85. Runs against a real local Supabase (`supabase start`).
describe("item wears (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  test("log and undo wears of a piece; others can't touch them", async () => {
    const owner = await createTestUser();
    const piece = await createItem(owner.client, {
      title: "Denim Jacket",
      item_type_id: itemTypeId,
      source: "closet",
    });

    await logWear(owner.client, piece.id);
    await logWear(owner.client, piece.id);
    expect((await listWearCounts(owner.client)).get(piece.id)).toBe(2);
    expect(await undoWear(owner.client, piece.id)).toBe(true);
    expect((await listWearCounts(owner.client)).get(piece.id)).toBe(1);

    const stranger = await createTestUser();
    await expect(logWear(stranger.client, piece.id)).rejects.toThrow();
    expect(await undoWear(stranger.client, piece.id)).toBe(false);
    expect((await listWearCounts(stranger.client)).size).toBe(0);
    expect((await listWearCounts(owner.client)).get(piece.id)).toBe(1);
  });

  test("an outfit logs a wear for each piece, and undo removes just that", async () => {
    const owner = await createTestUser();
    const [top, skirt] = await Promise.all(
      ["Top", "Skirt"].map((title) =>
        createItem(owner.client, {
          title,
          item_type_id: itemTypeId,
          source: "closet",
        }),
      ),
    );
    const { data: outfit, error } = await owner.client
      .from("outfits")
      .insert({ name: "Brunch", user_id: owner.userId })
      .select("id")
      .single();
    if (error) throw error;
    const { error: piecesError } = await owner.client
      .from("outfit_items")
      .insert(
        [top, skirt].map((p) => ({ outfit_id: outfit.id, item_id: p.id })),
      );
    if (piecesError) throw piecesError;

    await logWear(owner.client, top.id); // worn on its own, too
    expect(await logOutfitWear(owner.client, outfit.id)).toBe(2);
    let counts = await listWearCounts(owner.client);
    expect(counts.get(top.id)).toBe(2);
    expect(counts.get(skirt.id)).toBe(1);

    expect(await undoOutfitWear(owner.client, outfit.id)).toBe(2);
    counts = await listWearCounts(owner.client);
    expect(counts.get(top.id)).toBe(1);
    expect(counts.has(skirt.id)).toBe(false);

    // Someone else's outfit: nothing is logged.
    const stranger = await createTestUser();
    await expect(logOutfitWear(stranger.client, outfit.id)).resolves.toBe(0);
  });
});
