import { beforeAll, describe, expect, test } from "vitest";
import {
  createItem,
  deleteItem,
  deleteItems,
  archiveItem,
  createItems,
  listAllItemsForExport,
  listArchivedItems,
  restoreItem,
  getItem,
  listItems,
  updateItem,
} from "./items";
import { listItemTypes } from "./item-types";
import { addItemsToWishlists, createWishlist, getWishlist } from "./wishlists";
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
    expect(stillThere?.title).toBe("Protected Item");
    // ...and the other user can't even read it.
    expect(await getItem(userB.client, item.id)).toBeNull();
  });

  test("deleteItem removes the item for its owner", async () => {
    const { client } = await createTestUser();

    const item = await createItem(client, {
      title: "Delete Me",
      item_type_id: itemTypeId,
    });
    await deleteItem(client, item.id);

    expect(await getItem(client, item.id)).toBeNull();
    expect(await getItem(client, "not-a-uuid")).toBeNull();
  });

  test("deleteItems deletes only the caller's own items and reports them", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const mine = await Promise.all(
      ["One", "Two", "Keep"].map((title) =>
        createItem(owner.client, { title, item_type_id: itemTypeId }),
      ),
    );
    const theirs = await createItem(other.client, {
      title: "Not yours",
      item_type_id: itemTypeId,
    });

    const deleted = await deleteItems(owner.client, [
      mine[0].id,
      mine[1].id,
      theirs.id,
    ]);

    expect(deleted.map((d) => d.id).sort()).toEqual(
      [mine[0].id, mine[1].id].sort(),
    );
    expect(await getItem(owner.client, mine[0].id)).toBeNull();
    expect(await getItem(owner.client, mine[2].id)).not.toBeNull();
    expect(await getItem(other.client, theirs.id)).not.toBeNull();
    expect(await deleteItems(owner.client, [])).toEqual([]);
  });

  test("archive hides an item and takes it off lists; restore brings it back (KAM-82)", async () => {
    const owner = await createTestUser();
    const item = await createItem(owner.client, {
      title: "Lukewarm Lamp",
      item_type_id: itemTypeId,
    });
    const list = await createWishlist(owner.client, "Home");
    await addItemsToWishlists(owner.client, [item.id], [list.id]);

    // Someone else can't archive it.
    const stranger = await createTestUser();
    await archiveItem(stranger.client, item.id);
    expect((await listItems(owner.client)).map((i) => i.id)).toContain(item.id);

    await archiveItem(owner.client, item.id);
    expect((await listItems(owner.client)).map((i) => i.id)).not.toContain(
      item.id,
    );
    expect((await listArchivedItems(owner.client)).map((i) => i.id)).toEqual([
      item.id,
    ]);
    const onList = await getWishlist(owner.client, list.id);
    expect(onList?.wishlist_items).toEqual([]);

    await restoreItem(owner.client, item.id);
    expect((await listItems(owner.client)).map((i) => i.id)).toContain(item.id);
    expect(await listArchivedItems(owner.client)).toEqual([]);
  });

  test("purchased items can't be archived", async () => {
    const { client } = await createTestUser();
    const item = await createItem(client, {
      title: "Bought",
      item_type_id: itemTypeId,
    });
    await updateItem(client, item.id, { purchased: true });
    await archiveItem(client, item.id);
    expect(await listArchivedItems(client)).toEqual([]);
  });

  test("createItems adds new rows only for the caller; export lists them all (KAM-87)", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    const existing = await createItem(owner.client, {
      title: "Already Here",
      item_type_id: itemTypeId,
    });

    expect(
      await createItems(owner.client, [
        {
          user_id: owner.userId,
          title: "Imported A",
          item_type_id: itemTypeId,
          source: "wishlist",
        },
        {
          user_id: owner.userId,
          title: "Imported Closet",
          item_type_id: itemTypeId,
          source: "closet",
        },
      ]),
    ).toBe(2);
    const titles = (await listAllItemsForExport(owner.client)).map(
      (i) => i.title,
    );
    expect(titles).toEqual(["Already Here", "Imported A", "Imported Closet"]);
    expect((await getItem(owner.client, existing.id))?.title).toBe(
      "Already Here",
    );

    // Can't add items to someone else's account.
    await expect(
      createItems(stranger.client, [
        { user_id: owner.userId, title: "Sneaky", item_type_id: itemTypeId },
      ]),
    ).rejects.toThrow();
    expect(await listAllItemsForExport(stranger.client)).toEqual([]);
  });
});
