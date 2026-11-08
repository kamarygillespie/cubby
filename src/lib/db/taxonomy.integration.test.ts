import { beforeAll, describe, expect, test } from "vitest";
import { createItem, updateItem } from "./items";
import {
  createCategory,
  createItemType,
  deleteCategory,
  deleteItemType,
  listCategories,
  listTaxonomy,
  renameItemType,
} from "./taxonomy";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("lib/db/taxonomy (integration)", () => {
  let systemCategoryId: string;
  let systemTypeId: string;

  beforeAll(async () => {
    const { data: category } = await admin
      .from("categories")
      .select("id")
      .eq("is_system", true)
      .eq("name", "Shoes")
      .single();
    systemCategoryId = category!.id;
    const { data: type } = await admin
      .from("item_types")
      .select("id")
      .eq("is_system", true)
      .limit(1)
      .single();
    systemTypeId = type!.id;
  });

  test("create a custom category + item type and use it on an item", async () => {
    const { client } = await createTestUser();
    const category = await createCategory(client, "Home Decor");
    const type = await createItemType(client, "Candles", category.id);
    expect(type.category?.name).toBe("Home Decor");

    const item = await createItem(client, {
      title: "Fig candle",
      item_type_id: type.id,
    });
    expect(item.item_type.name).toBe("Candles");

    const taxonomy = await listTaxonomy(client);
    const decor = taxonomy.find((c) => c.name === "Home Decor");
    expect(decor?.is_system).toBe(false);
    expect(decor?.item_types).toEqual([
      expect.objectContaining({ name: "Candles", itemCount: 1 }),
    ]);
  });

  test("a custom type can live under a system category", async () => {
    const { client } = await createTestUser();
    const type = await createItemType(client, "Rain Boots", systemCategoryId);
    expect(type.category?.name).toBe("Shoes");
  });

  test("custom taxonomy is private to its owner (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const category = await createCategory(owner.client, "Owner Only");
    await createItemType(owner.client, "Secret Type", category.id);

    const visible = await listCategories(other.client);
    expect(visible.map((c) => c.name)).not.toContain("Owner Only");
  });

  test("cannot file a type under, or point an item at, someone else's custom taxonomy (RLS)", async () => {
    // Regression for the reference-ownership gap fixed in
    // 20261108230000_taxonomy_reference_ownership.
    const victim = await createTestUser();
    const attacker = await createTestUser();
    const victimCategory = await createCategory(victim.client, "Victim Cat");
    const victimType = await createItemType(
      victim.client,
      "Victim Type",
      victimCategory.id,
    );

    await expect(
      createItemType(attacker.client, "Squatter", victimCategory.id),
    ).rejects.toThrow();
    await expect(
      createItem(attacker.client, { title: "x", item_type_id: victimType.id }),
    ).rejects.toThrow();

    const own = await createItem(attacker.client, {
      title: "y",
      item_type_id: systemTypeId,
    });
    await expect(
      updateItem(attacker.client, own.id, { item_type_id: victimType.id }),
    ).rejects.toThrow();

    // ...so the victim can still delete their own taxonomy.
    await deleteItemType(victim.client, victimType.id);
    await deleteCategory(victim.client, victimCategory.id);
  });

  test("duplicate names are rejected, ignoring case, including system names", async () => {
    const { client } = await createTestUser();
    await expect(
      createItemType(client, "boots", systemCategoryId),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(createCategory(client, "SHOES")).rejects.toMatchObject({
      code: "23505",
    });

    await createItemType(client, "Mules", systemCategoryId);
    await expect(
      createItemType(client, "mules", systemCategoryId),
    ).rejects.toMatchObject({ code: "23505" });

    // Another user can still use the same custom name.
    const other = await createTestUser();
    await expect(
      createItemType(other.client, "Mules", systemCategoryId),
    ).resolves.toBeTruthy();
  });

  test("in-use types can't be deleted; system rows can't be changed", async () => {
    const { client } = await createTestUser();
    const type = await createItemType(client, "Slides", systemCategoryId);
    await createItem(client, { title: "Pool slides", item_type_id: type.id });

    await expect(deleteItemType(client, type.id)).rejects.toMatchObject({
      code: "23503",
    });
    await expect(
      renameItemType(client, systemTypeId, "Hacked"),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      deleteCategory(client, systemCategoryId),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
