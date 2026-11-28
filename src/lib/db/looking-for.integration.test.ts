import { beforeAll, describe, expect, test } from "vitest";
import { listItemTypes } from "./item-types";
import { createItem } from "./items";
import {
  addLookingFor,
  getLookingFor,
  listLookingFor,
  markLookingForFound,
  removeLookingFor,
} from "./looking-for";
import { admin, createTestUser } from "./integration-test-utils";

// KAM-102. Runs against a real local Supabase (`supabase start`).
describe("looking for (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  test("add, find and remove, for the owner only", async () => {
    const owner = await createTestUser();
    await addLookingFor(owner.client, {
      title: "Essential oil diffuser",
      notes: "white or wood",
      budget: 60,
      item_type_id: itemTypeId,
    });
    const [entry] = await listLookingFor(owner.client);
    expect(entry).toMatchObject({
      title: "Essential oil diffuser",
      notes: "white or wood",
      budget: 60,
      found_at: null,
    });

    const item = await createItem(owner.client, {
      title: "Vitruvi Stone Diffuser",
      item_type_id: itemTypeId,
    });
    await markLookingForFound(owner.client, entry.id, item.id);
    const found = await getLookingFor(owner.client, entry.id);
    expect(found?.found_at).not.toBeNull();
    expect(found?.found_item).toEqual({
      id: item.id,
      title: "Vitruvi Stone Diffuser",
    });

    // Strangers can't see, change or remove it.
    const stranger = await createTestUser();
    expect(await listLookingFor(stranger.client)).toEqual([]);
    await removeLookingFor(stranger.client, entry.id);
    expect(await getLookingFor(owner.client, entry.id)).not.toBeNull();

    await removeLookingFor(owner.client, entry.id);
    expect(await listLookingFor(owner.client)).toEqual([]);
  });

  test("an entry can't point at someone else's item", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const theirs = await createItem(other.client, {
      title: "Not yours",
      item_type_id: itemTypeId,
    });
    await addLookingFor(owner.client, {
      title: "Lamp",
      notes: null,
      budget: null,
    });
    const [entry] = await listLookingFor(owner.client);
    await expect(
      markLookingForFound(owner.client, entry.id, theirs.id),
    ).rejects.toThrow();
  });
});
