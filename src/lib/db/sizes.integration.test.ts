import { beforeAll, describe, expect, test } from "vitest";
import { listItemTypes } from "./item-types";
import { addItemsToWishlists, createWishlist, getWishlist } from "./wishlists";
import { createItem, updateItem } from "./items";
import {
  getSharedListExtras,
  getSizes,
  saveSizes,
  setWishlistShowSizes,
} from "./sizes";
import {
  admin,
  createAnonClient,
  createTestUser,
} from "./integration-test-utils";

// KAM-78 + KAM-80. Runs against a real local Supabase (`supabase start`).
describe("share page sizes and most wanted (integration)", () => {
  let bootsTypeId: string;

  beforeAll(async () => {
    const types = await listItemTypes(admin);
    bootsTypeId = types.find((t) => t.name === "Boots")!.id;
  });

  test("shares sizes, item types and a 5-star flag, nothing more", async () => {
    const owner = await createTestUser();
    await saveSizes(owner.client, { shoes: "8.5", tops: "M" });
    expect(await getSizes(owner.client)).toEqual({ shoes: "8.5", tops: "M" });

    const [loved, liked, bought] = await Promise.all(
      [5, 3, 5].map((interest_level, i) =>
        createItem(owner.client, {
          title: `Item ${i}`,
          item_type_id: bootsTypeId,
          interest_level,
        }),
      ),
    );
    await updateItem(owner.client, bought.id, { purchased: true });
    const list = await createWishlist(owner.client, "Birthday");
    await addItemsToWishlists(
      owner.client,
      [loved.id, liked.id, bought.id],
      [list.id],
    );
    const { share_token } = (await getWishlist(owner.client, list.id))!;

    const anon = createAnonClient();
    const extras = await getSharedListExtras(anon, share_token);
    expect(extras.sizes).toEqual({ shoes: "8.5", tops: "M" });
    expect(extras.items.get(loved.id)).toEqual({
      itemType: "Boots",
      category: "Shoes",
      mostWanted: true,
    });
    expect(extras.items.get(liked.id)?.mostWanted).toBe(false);
    // Purchased items aren't on the share page, so nothing about them is.
    expect(extras.items.has(bought.id)).toBe(false);

    // The raw response never carries the star rating itself.
    const raw = await anon.rpc("get_shared_list_extras", {
      token: share_token,
    });
    expect(JSON.stringify(raw.data)).not.toContain("interest");

    await setWishlistShowSizes(owner.client, list.id, false);
    expect((await getSharedListExtras(anon, share_token)).sizes).toBeNull();
  });

  test("unknown tokens get nothing, and nobody else can change your sizes", async () => {
    const anon = createAnonClient();
    const none = await getSharedListExtras(anon, crypto.randomUUID());
    expect(none.sizes).toBeNull();
    expect(none.items.size).toBe(0);

    const owner = await createTestUser();
    const stranger = await createTestUser();
    await saveSizes(owner.client, { rings: "6" });
    await stranger.client
      .from("profiles")
      .update({ sizes: { rings: "99" } })
      .eq("id", owner.userId);
    expect(await getSizes(owner.client)).toEqual({ rings: "6" });
  });
});
