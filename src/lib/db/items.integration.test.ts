import { beforeAll, describe, expect, test } from "vitest";
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from "./items";
import { listItemTypes } from "./item-types";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("lib/db/items (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    const itemTypes = await listItemTypes(admin);
    itemTypeId = itemTypes[0].id;
  });

  test("createItem scopes the row to the authenticated user and joins item_type/category", async () => {
    const { userId, client } = await createTestUser();

    const item = await createItem(client, {
      title: "Test Item",
      item_type_id: itemTypeId,
      price: 100,
    });

    expect(item.user_id).toBe(userId);
    expect(item.item_type.id).toBe(itemTypeId);
    expect(item.item_type.category.id).toBeTruthy();
  });

  test("discount_percent is computed by the database from price/sale_price", async () => {
    const { client } = await createTestUser();

    const item = await createItem(client, {
      title: "Sale Item",
      item_type_id: itemTypeId,
      price: 100,
      sale_price: 75,
    });

    expect(item.discount_percent).toBe(25);
  });

  test("toggling purchased on sets purchased_date; toggling off clears it", async () => {
    const { client } = await createTestUser();

    const created = await createItem(client, {
      title: "Purchase Me",
      item_type_id: itemTypeId,
    });
    expect(created.purchased_date).toBeNull();

    const purchased = await updateItem(client, created.id, {
      purchased: true,
    });
    expect(purchased.purchased_date).not.toBeNull();

    const unpurchased = await updateItem(client, created.id, {
      purchased: false,
    });
    expect(unpurchased.purchased_date).toBeNull();
  });

  test("listItems only returns the authenticated user's own items (RLS)", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    await createItem(userA.client, {
      title: "User A Item",
      item_type_id: itemTypeId,
    });
    await createItem(userB.client, {
      title: "User B Item",
      item_type_id: itemTypeId,
    });

    const aItems = await listItems(userA.client);
    expect(aItems.some((i) => i.title === "User A Item")).toBe(true);
    expect(aItems.some((i) => i.title === "User B Item")).toBe(false);
  });

  test("a user cannot update or delete another user's item (RLS)", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const item = await createItem(userA.client, {
      title: "Protected Item",
      item_type_id: itemTypeId,
    });

    await expect(
      updateItem(userB.client, item.id, { title: "Hacked" }),
    ).rejects.toThrow();

    // DELETE on a row RLS hides isn't an error, just zero rows affected.
    await deleteItem(userB.client, item.id);
    const stillThere = await getItem(userA.client, item.id);
    expect(stillThere.title).toBe("Protected Item");
  });

  test("deleteItem removes the item for its owner", async () => {
    const { client } = await createTestUser();

    const item = await createItem(client, {
      title: "Delete Me",
      item_type_id: itemTypeId,
    });
    await deleteItem(client, item.id);

    await expect(getItem(client, item.id)).rejects.toThrow();
  });
});
