import { beforeAll, describe, expect, test } from "vitest";
import { listItemTypes } from "./item-types";
import {
  addItemsToWishlists,
  createWishlist,
  deleteWishlist,
  getWishlist,
  listWishlists,
  removeItemFromWishlist,
  renameWishlist,
} from "./wishlists";
import { createItem, getItem } from "./items";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("lib/db/wishlists (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    const itemTypes = await listItemTypes(admin);
    itemTypeId = itemTypes[0].id;
  });

  test("adds several items to several lists at once, idempotently", async () => {
    const { client } = await createTestUser();
    const a = await createItem(client, {
      title: "A",
      item_type_id: itemTypeId,
    });
    const b = await createItem(client, {
      title: "B",
      item_type_id: itemTypeId,
    });
    const birthday = await createWishlist(client, "Birthday");
    const holidays = await createWishlist(client, "Holidays");

    await addItemsToWishlists(client, [a.id, b.id], [birthday.id, holidays.id]);
    // Re-adding an existing pair is a no-op, not an error.
    await addItemsToWishlists(client, [a.id], [birthday.id]);

    const lists = await listWishlists(client);
    expect(lists.map((l) => l.name)).toEqual(["Birthday", "Holidays"]);
    for (const list of lists) {
      expect(list.wishlist_items.map((wi) => wi.item_id).sort()).toEqual(
        [a.id, b.id].sort(),
      );
    }
  });

  test("listWishlists only returns the caller's own lists (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await createWishlist(owner.client, "Mine");

    expect(await listWishlists(other.client)).toEqual([]);
  });

  test("cannot add an item to another user's wishlist (RLS)", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const list = await createWishlist(owner.client, "Owner's list");
    const attackerItem = await createItem(attacker.client, {
      title: "Spam",
      item_type_id: itemTypeId,
    });

    await expect(
      addItemsToWishlists(attacker.client, [attackerItem.id], [list.id]),
    ).rejects.toThrow();
  });

  test("cannot add another user's item to your own wishlist (RLS)", async () => {
    // Regression: the original policy only checked wishlist ownership, so
    // this succeeded — and get_shared_wishlist() would then expose the
    // victim's item on the attacker's public share page.
    const victim = await createTestUser();
    const attacker = await createTestUser();
    const victimItem = await createItem(victim.client, {
      title: "Private item",
      item_type_id: itemTypeId,
    });
    const attackerList = await createWishlist(attacker.client, "Leak");

    await expect(
      addItemsToWishlists(attacker.client, [victimItem.id], [attackerList.id]),
    ).rejects.toThrow();

    const { data: shareToken } = await admin
      .from("wishlists")
      .select("share_token")
      .eq("id", attackerList.id)
      .single();
    const { data: shared } = await admin.rpc("get_shared_wishlist", {
      token: shareToken!.share_token,
    });
    expect(shared).toEqual([]);
  });

  test("getWishlist returns the list with full item rows, newest first", async () => {
    const { client } = await createTestUser();
    const first = await createItem(client, {
      title: "First",
      item_type_id: itemTypeId,
      price: 10,
    });
    const second = await createItem(client, {
      title: "Second",
      item_type_id: itemTypeId,
    });
    const list = await createWishlist(client, "Gifts");
    await addItemsToWishlists(client, [first.id], [list.id]);
    await addItemsToWishlists(client, [second.id], [list.id]);

    const fetched = await getWishlist(client, list.id);
    expect(fetched?.name).toBe("Gifts");
    expect(fetched?.wishlist_items.map((wi) => wi.item?.title)).toEqual([
      "Second",
      "First",
    ]);
    expect(fetched?.wishlist_items[1].item?.item_type.category.id).toBeTruthy();
  });

  test("getWishlist returns null for another user's list or a malformed id", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const list = await createWishlist(owner.client, "Private");

    expect(await getWishlist(other.client, list.id)).toBeNull();
    expect(await getWishlist(owner.client, "not-a-uuid")).toBeNull();
  });

  test("rename, remove item, and delete list (items survive)", async () => {
    const { client } = await createTestUser();
    const item = await createItem(client, {
      title: "Keep me",
      item_type_id: itemTypeId,
    });
    const list = await createWishlist(client, "Old name");
    await addItemsToWishlists(client, [item.id], [list.id]);

    await renameWishlist(client, list.id, "New name");
    expect((await getWishlist(client, list.id))?.name).toBe("New name");

    await removeItemFromWishlist(client, list.id, item.id);
    expect((await getWishlist(client, list.id))?.wishlist_items).toEqual([]);

    await addItemsToWishlists(client, [item.id], [list.id]);
    await deleteWishlist(client, list.id);
    expect(await getWishlist(client, list.id)).toBeNull();
    expect((await getItem(client, item.id)).title).toBe("Keep me");
  });

  test("cannot rename or delete another user's list (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const list = await createWishlist(owner.client, "Mine");

    // RLS filters the rows out, so these are silent no-ops, not errors.
    await renameWishlist(other.client, list.id, "Hijacked");
    await deleteWishlist(other.client, list.id);

    expect((await getWishlist(owner.client, list.id))?.name).toBe("Mine");
  });
});
