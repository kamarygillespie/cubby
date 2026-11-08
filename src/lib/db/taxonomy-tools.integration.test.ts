import { beforeAll, describe, expect, test } from "vitest";
import { createItem, getItem } from "./items";
import {
  createItemType,
  listTaxonomy,
  mergeItemType,
  setItemsType,
} from "./taxonomy";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("taxonomy tools (integration)", () => {
  let shoesId: string;
  let bootsId: string; // a system item type
  let flatsId: string; // another system item type

  beforeAll(async () => {
    const { data: shoes } = await admin
      .from("categories")
      .select("id")
      .eq("name", "Shoes")
      .eq("is_system", true)
      .single();
    shoesId = shoes!.id;
    const { data: types } = await admin
      .from("item_types")
      .select("id, name")
      .eq("is_system", true)
      .in("name", ["Boots", "Flats"]);
    bootsId = types!.find((t) => t.name === "Boots")!.id;
    flatsId = types!.find((t) => t.name === "Flats")!.id;
  });

  test("bulk-change the type of several items", async () => {
    const { client } = await createTestUser();
    const a = await createItem(client, { title: "A", item_type_id: bootsId });
    const b = await createItem(client, { title: "B", item_type_id: bootsId });

    expect(await setItemsType(client, [a.id, b.id], flatsId)).toBe(2);
    expect((await getItem(client, a.id))?.item_type.name).toBe("Flats");
    expect((await getItem(client, b.id))?.item_type.name).toBe("Flats");
  });

  test("bulk-change skips other users' items and rejects their custom types (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const theirs = await createItem(owner.client, {
      title: "Not yours",
      item_type_id: bootsId,
    });
    const mine = await createItem(other.client, {
      title: "Mine",
      item_type_id: bootsId,
    });

    expect(await setItemsType(other.client, [theirs.id], flatsId)).toBe(0);
    expect((await getItem(owner.client, theirs.id))?.item_type.name).toBe(
      "Boots",
    );

    const ownersType = await createItemType(
      owner.client,
      "Owner Mules",
      shoesId,
    );
    await expect(
      setItemsType(other.client, [mine.id], ownersType.id),
    ).rejects.toThrow();
  });

  test("merge moves items into the target and deletes the duplicate", async () => {
    const { client } = await createTestUser();
    const dupe = await createItemType(client, "Ankle Boots", shoesId);
    const a = await createItem(client, { title: "A", item_type_id: dupe.id });
    const b = await createItem(client, { title: "B", item_type_id: dupe.id });

    expect(await mergeItemType(client, dupe.id, bootsId)).toBe(2);
    expect((await getItem(client, a.id))?.item_type.id).toBe(bootsId);
    expect((await getItem(client, b.id))?.item_type.id).toBe(bootsId);
    const names = (await listTaxonomy(client)).flatMap((c) =>
      c.item_types.map((t) => t.name),
    );
    expect(names).not.toContain("Ankle Boots");
  });

  test("merge refuses system sources, others' types, and merging into itself", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const ownersType = await createItemType(owner.client, "Clogs Too", shoesId);

    await expect(
      mergeItemType(owner.client, bootsId, flatsId),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      mergeItemType(other.client, ownersType.id, bootsId),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      mergeItemType(
        other.client,
        (await createItemType(other.client, "Mine X", shoesId)).id,
        ownersType.id,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      mergeItemType(owner.client, ownersType.id, ownersType.id),
    ).rejects.toMatchObject({ code: "22023" });

    // Nothing changed for the owner.
    const names = (await listTaxonomy(owner.client)).flatMap((c) =>
      c.item_types.map((t) => t.name),
    );
    expect(names).toContain("Clogs Too");
  });
});
