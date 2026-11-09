import { beforeAll, describe, expect, test } from "vitest";
import { createItem, listClosetItems, listItems, updateItem } from "./items";
import { listItemTypes } from "./item-types";
import { isInCloset } from "@/lib/closet";
import { totalSpent } from "@/lib/items-view";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("closet (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  test("closet = added pieces + bought-for-me + gifts received; never totals", async () => {
    const { client } = await createTestUser();
    const make = (title: string, extra: object = {}) =>
      createItem(client, {
        title,
        item_type_id: itemTypeId,
        price: 100,
        ...extra,
      });

    await make("Wish");
    const bought = await make("Bought");
    await updateItem(client, bought.id, { purchased: true });
    const gift = await make("Gift received");
    await updateItem(client, gift.id, { gifted: true });
    const giveaway = await make("Bought for someone");
    await updateItem(client, giveaway.id, { purchased: true, gifted: true });
    await make("Old jeans", { source: "closet" });

    const closet = await listClosetItems(client);
    expect(closet.map((i) => i.title).sort()).toEqual([
      "Bought",
      "Gift received",
      "Old jeans",
    ]);
    // The DB query and the pure rule agree.
    expect(closet.every(isInCloset)).toBe(true);

    // Closet-only pieces never reach wishlist views or spending.
    const wishlistItems = await listItems(client);
    expect(wishlistItems.map((i) => i.title)).not.toContain("Old jeans");
    expect(totalSpent(wishlistItems)).toBe(200); // Bought + Bought for someone
  });

  test("the closet is private (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await createItem(owner.client, {
      title: "Owner's coat",
      item_type_id: itemTypeId,
      source: "closet",
    });
    expect(await listClosetItems(other.client)).toEqual([]);
  });

  test("source is limited to wishlist/closet", async () => {
    const { client } = await createTestUser();
    await expect(
      createItem(client, {
        title: "x",
        item_type_id: itemTypeId,
        source: "other",
      }),
    ).rejects.toThrow();
  });
});
