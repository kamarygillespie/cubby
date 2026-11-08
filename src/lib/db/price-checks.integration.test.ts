import { beforeAll, describe, expect, test } from "vitest";
import { createItem, getItem, recordPriceCheck } from "./items";
import { listItemTypes } from "./item-types";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against a real local Supabase instance (`supabase start`) — see
// integration-test-utils.ts. Exercises record_price_check(), the single
// write path for manual and scheduled price checks.

describe("record_price_check (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  async function newItem(client: Parameters<typeof createItem>[0]) {
    return createItem(client, {
      title: "Sneakers",
      item_type_id: itemTypeId,
      price: 80,
      link: "https://shop.example/sneakers",
    });
  }

  test("a readable check updates prices, stamps the item, and logs history", async () => {
    const { client } = await createTestUser();
    const item = await newItem(client);

    await recordPriceCheck(client, item.id, { price: 73, salePrice: 49.99 });

    const after = await getItem(client, item.id);
    expect(after).toMatchObject({ price: 73, sale_price: 49.99 });
    expect(after?.discount_percent).toBeCloseTo(31.52, 1);
    expect(after?.price_checked_at).toBeTruthy();

    const { data: history } = await client
      .from("item_price_checks")
      .select("status, price, sale_price")
      .eq("item_id", item.id);
    expect(history).toEqual([{ status: "ok", price: 73, sale_price: 49.99 }]);
  });

  test("an unreadable check never wipes a known price", async () => {
    const { client } = await createTestUser();
    const item = await newItem(client);
    await recordPriceCheck(client, item.id, { price: 73, salePrice: 49.99 });

    await recordPriceCheck(client, item.id, { price: null, salePrice: null });

    expect(await getItem(client, item.id)).toMatchObject({
      price: 73,
      sale_price: 49.99,
    });
    const { data: history } = await client
      .from("item_price_checks")
      .select("status")
      .eq("item_id", item.id)
      .order("checked_at");
    expect(history?.map((h) => h.status)).toEqual(["ok", "unreadable"]);
  });

  test("a missing or not-lower sale price ends the sale", async () => {
    const { client } = await createTestUser();
    const item = await newItem(client);
    await recordPriceCheck(client, item.id, { price: 73, salePrice: 49.99 });

    await recordPriceCheck(client, item.id, { price: 73, salePrice: null });
    expect(await getItem(client, item.id)).toMatchObject({ sale_price: null });

    await recordPriceCheck(client, item.id, { price: 60, salePrice: 60 });
    expect(await getItem(client, item.id)).toMatchObject({
      price: 60,
      sale_price: null,
    });
  });

  test("price history and checks are private to the item's owner (RLS)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const item = await newItem(owner.client);
    await recordPriceCheck(owner.client, item.id, {
      price: 50,
      salePrice: null,
    });

    const { data: seen } = await other.client
      .from("item_price_checks")
      .select("id")
      .eq("item_id", item.id);
    expect(seen).toEqual([]);

    await expect(
      recordPriceCheck(other.client, item.id, { price: 1, salePrice: null }),
    ).rejects.toThrow();
    expect(await getItem(owner.client, item.id)).toMatchObject({ price: 50 });
  });

  test("deleting an item removes its price history", async () => {
    const { client } = await createTestUser();
    const item = await newItem(client);
    await recordPriceCheck(client, item.id, { price: 50, salePrice: null });
    await client.from("items").delete().eq("id", item.id);

    const { data } = await admin
      .from("item_price_checks")
      .select("id")
      .eq("item_id", item.id);
    expect(data).toEqual([]);
  });
});
