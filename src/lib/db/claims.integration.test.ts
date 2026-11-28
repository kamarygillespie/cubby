import { beforeAll, describe, expect, test } from "vitest";
import { listItemTypes } from "./item-types";
import { addItemsToWishlists, createWishlist, getWishlist } from "./wishlists";
import { createItem, updateItem } from "./items";
import {
  claimSharedItem,
  getSharedClaims,
  listClaimsOnMyItems,
  setShowClaims,
  unclaimSharedItem,
} from "./claims";
import {
  admin,
  createAnonClient,
  createTestUser,
} from "./integration-test-utils";

// KAM-77. Runs against a real local Supabase instance (`supabase start`).
describe("gift claims on shared lists (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  async function sharedList(titles: string[]) {
    const owner = await createTestUser();
    const items = await Promise.all(
      titles.map((title) =>
        createItem(owner.client, { title, item_type_id: itemTypeId }),
      ),
    );
    const list = await createWishlist(owner.client, "Holidays");
    await addItemsToWishlists(
      owner.client,
      items.map((i) => i.id),
      [list.id],
    );
    const { share_token } = (await getWishlist(owner.client, list.id))!;
    return { owner, items, token: share_token };
  }

  test("only one giver can claim an item, and only they can undo it", async () => {
    const { items, token } = await sharedList(["Scarf"]);
    const anon = createAnonClient();
    const alice = crypto.randomUUID();
    const bob = crypto.randomUUID();

    expect(
      await claimSharedItem(anon, token, items[0].id, alice, "Alice"),
    ).toBe("claimed");
    expect(await claimSharedItem(anon, token, items[0].id, bob, null)).toBe(
      "taken",
    );
    expect(await claimSharedItem(anon, token, items[0].id, alice, null)).toBe(
      "mine",
    );

    const forAlice = await getSharedClaims(anon, token, alice);
    const forBob = await getSharedClaims(anon, token, bob);
    expect(forAlice.states.get(items[0].id)).toBe("mine");
    expect(forBob.states.get(items[0].id)).toBe("taken");

    expect(await unclaimSharedItem(anon, token, items[0].id, bob)).toBe(false);
    expect(await unclaimSharedItem(anon, token, items[0].id, alice)).toBe(true);
    expect((await getSharedClaims(anon, token, bob)).states.size).toBe(0);
  });

  test("claims need the right token and a visible item", async () => {
    const { owner, items, token } = await sharedList(["Mug", "Lamp"]);
    const other = await sharedList(["Other"]);
    const anon = createAnonClient();
    const key = crypto.randomUUID();

    // Another list's token can't reach this item.
    expect(
      await claimSharedItem(anon, other.token, items[0].id, key, null),
    ).toBe("not_found");
    // A purchased item has dropped off the share page.
    await updateItem(owner.client, items[1].id, { purchased: true });
    expect(await claimSharedItem(anon, token, items[1].id, key, null)).toBe(
      "not_found",
    );
    expect(
      await claimSharedItem(anon, token, items[0].id, "not-a-uuid", null),
    ).toBe("not_found");
  });

  test("the owner's preview hides claims unless Show claims is on", async () => {
    const { owner, items, token } = await sharedList(["Boots"]);
    await claimSharedItem(
      createAnonClient(),
      token,
      items[0].id,
      crypto.randomUUID(),
      "Mom",
    );

    const hidden = await getSharedClaims(owner.client, token, null);
    expect(hidden.owner).toBe(true);
    expect(hidden.states.size).toBe(0);
    // The owner can't claim from their own list either.
    expect(
      await claimSharedItem(
        owner.client,
        token,
        items[0].id,
        crypto.randomUUID(),
        null,
      ),
    ).toBe("owner");

    await setShowClaims(owner.client, true);
    const shown = await getSharedClaims(owner.client, token, null);
    expect(shown.states.get(items[0].id)).toBe("taken");
    expect((await listClaimsOnMyItems(owner.client)).get(items[0].id)).toBe(
      "Mom",
    );
  });

  test("nobody can read the claims table directly, or givers' keys", async () => {
    const { items, token } = await sharedList(["Ring"]);
    await claimSharedItem(
      createAnonClient(),
      token,
      items[0].id,
      crypto.randomUUID(),
      "Secret Santa",
    );

    const stranger = await createTestUser();
    expect((await listClaimsOnMyItems(stranger.client)).size).toBe(0);
    const anonRead = await createAnonClient().from("item_claims").select("*");
    expect(anonRead.data ?? []).toHaveLength(0);

    const { error } = await stranger.client
      .from("item_claims")
      .select("claimer_key");
    expect(error).not.toBeNull();
    const insert = await stranger.client.from("item_claims").insert({
      item_id: items[0].id,
      user_id: stranger.userId,
      claimer_key: crypto.randomUUID(),
    });
    expect(insert.error).not.toBeNull();
  });
});
