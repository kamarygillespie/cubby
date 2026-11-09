import { beforeAll, describe, expect, test } from "vitest";
import { createItem, deleteItem } from "./items";
import { listItemTypes } from "./item-types";
import {
  createOutfit,
  deleteOutfit,
  getOutfit,
  listOutfits,
  listOutfitsForItem,
  setOutfitPieces,
} from "./outfits";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("outfits (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  const piece = (client: Parameters<typeof createItem>[0], title: string) =>
    createItem(client, { title, item_type_id: itemTypeId, source: "closet" });

  test("create an outfit from pieces, change its pieces, see where a piece is used", async () => {
    const { client } = await createTestUser();
    const jeans = await piece(client, "Jeans");
    const tee = await piece(client, "Tee");
    const blazer = await piece(client, "Blazer");

    const { id } = await createOutfit(client, {
      name: "Friday",
      photoUrl: null,
      itemIds: [jeans.id, tee.id],
    });
    let outfit = await getOutfit(client, id);
    expect(outfit?.outfit_items.map((p) => p.item?.title)).toEqual([
      "Jeans",
      "Tee",
    ]);

    await setOutfitPieces(client, id, [tee.id, blazer.id]);
    outfit = await getOutfit(client, id);
    expect(outfit?.outfit_items.map((p) => p.item?.title).sort()).toEqual([
      "Blazer",
      "Tee",
    ]);
    expect(await listOutfitsForItem(client, tee.id)).toEqual([
      { id, name: "Friday" },
    ]);
    expect(await listOutfitsForItem(client, jeans.id)).toEqual([]);
  });

  test("deleting a piece removes it from outfits; deleting an outfit keeps pieces", async () => {
    const { client } = await createTestUser();
    const a = await piece(client, "A");
    const b = await piece(client, "B");
    const { id } = await createOutfit(client, {
      name: "Look",
      photoUrl: null,
      itemIds: [a.id, b.id],
    });

    await deleteItem(client, a.id);
    expect((await getOutfit(client, id))?.outfit_items).toHaveLength(1);

    await deleteOutfit(client, id);
    expect(await getOutfit(client, id)).toBeNull();
    const { data } = await admin.from("items").select("id").eq("id", b.id);
    expect(data).toHaveLength(1);
  });

  test("outfits are private, and can't include someone else's pieces (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const ownersPiece = await piece(owner.client, "Owner's coat");
    const { id } = await createOutfit(owner.client, {
      name: "Private",
      photoUrl: null,
      itemIds: [ownersPiece.id],
    });

    expect(await listOutfits(other.client)).toEqual([]);
    expect(await getOutfit(other.client, id)).toBeNull();
    expect(await getOutfit(owner.client, "not-a-uuid")).toBeNull();

    // Other user can't put the owner's piece in their own outfit...
    await expect(
      createOutfit(other.client, {
        name: "Sneaky",
        photoUrl: null,
        itemIds: [ownersPiece.id],
      }),
    ).rejects.toThrow();
    // ...or add their own piece to the owner's outfit.
    const theirs = await piece(other.client, "Mine");
    await expect(
      setOutfitPieces(other.client, id, [theirs.id]),
    ).rejects.toThrow();
    expect((await getOutfit(owner.client, id))?.outfit_items).toHaveLength(1);
  });
});
