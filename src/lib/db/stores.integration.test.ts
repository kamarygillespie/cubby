import { describe, expect, test } from "vitest";
import {
  listFavoriteStores,
  setFavoriteStore,
  setStoreSaleUrl,
} from "./stores";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts.

describe("favorite stores (integration)", () => {
  test("star, add a sale link, unstar", async () => {
    const { client } = await createTestUser();
    await setFavoriteStore(client, "  Mejuri ", true);
    await setFavoriteStore(client, "mejuri", true); // same store: no-op
    await setStoreSaleUrl(client, "mejuri", "https://mejuri.com/sale");
    expect(await listFavoriteStores(client)).toEqual([
      {
        store_key: "mejuri",
        display_name: "Mejuri",
        sale_url: "https://mejuri.com/sale",
      },
    ]);

    await setFavoriteStore(client, "MEJURI", false);
    expect(await listFavoriteStores(client)).toEqual([]);
  });

  test("favorites are private (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await setFavoriteStore(owner.client, "Everlane", true);
    expect(await listFavoriteStores(other.client)).toEqual([]);
    await setStoreSaleUrl(other.client, "everlane", "https://evil.example");
    expect((await listFavoriteStores(owner.client))[0].sale_url).toBeNull();
  });

  test("the database rejects non-web sale links and unnormalized keys", async () => {
    const { userId, client } = await createTestUser();
    await setFavoriteStore(client, "Aritzia", true);
    await expect(
      setStoreSaleUrl(client, "aritzia", "javascript:alert(1)"),
    ).rejects.toThrow();
    const { error } = await admin.from("favorite_stores").insert({
      user_id: userId,
      store_key: " Mixed Case ",
      display_name: "x",
    });
    expect(error).not.toBeNull();
  });
});
