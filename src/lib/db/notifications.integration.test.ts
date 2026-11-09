import { beforeAll, describe, expect, it } from "vitest";
import { createItem, recordPriceCheck, updateItem } from "./items";
import { listItemTypes } from "./item-types";
import { setFavoriteStore } from "./stores";
import {
  countUnreadNotifications,
  deletePushSubscription,
  getNotificationSettings,
  listNotifications,
  markAllNotificationsRead,
  openNotification,
  saveNotificationSettings,
  savePushSubscription,
} from "./notifications";
import { admin, createTestUser } from "./integration-test-utils";

// Runs against local Supabase. Exercises the notify_price_change() trigger
// (alerts from price checks) and the notification tables' RLS.

describe("notifications (integration)", () => {
  let itemTypeId: string;

  beforeAll(async () => {
    itemTypeId = (await listItemTypes(admin))[0].id;
  });

  type Client = Awaited<ReturnType<typeof createTestUser>>["client"];
  const newItem = (client: Client, extra: { store_brand?: string } = {}) =>
    createItem(client, {
      title: "Sneakers",
      item_type_id: itemTypeId,
      price: 100,
      link: "https://shop.example/sneakers",
      ...extra,
    });

  it("a price check that drops the price past the threshold creates one alert", async () => {
    const { client } = await createTestUser();
    const item = await newItem(client);

    await recordPriceCheck(client, item.id, { price: 100, salePrice: 95 }); // 5%: too small
    expect(await listNotifications(client)).toEqual([]);

    await recordPriceCheck(client, item.id, { price: 100, salePrice: 80 });
    const alerts = await listNotifications(client);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "price_drop",
      title: "Sneakers dropped to $80.00",
      body: "Was $95.00 — 16% less.",
      url: `/items/${item.id}/edit`,
      read_at: null,
    });

    // Same price again, or back up: no repeat
    await recordPriceCheck(client, item.id, { price: 100, salePrice: 80 });
    await recordPriceCheck(client, item.id, { price: 100, salePrice: null });
    expect(await listNotifications(client)).toHaveLength(1);
  });

  it("respects the user's settings, and ignores manual edits", async () => {
    const { client } = await createTestUser();
    expect(await getNotificationSettings(client)).toEqual({
      price_drops: true,
      store_sales: true,
      min_drop_percent: 10,
    });
    await saveNotificationSettings(client, {
      price_drops: true,
      store_sales: true,
      min_drop_percent: 30,
    });
    const item = await newItem(client);

    await recordPriceCheck(client, item.id, { price: 100, salePrice: 80 }); // 20% < 30%
    await updateItem(client, item.id, { price: 10 }); // an edit, not a check
    expect(await listNotifications(client)).toEqual([]);

    await saveNotificationSettings(client, {
      price_drops: false,
      store_sales: true,
      min_drop_percent: 10,
    });
    await recordPriceCheck(client, item.id, { price: 5, salePrice: null });
    expect(await listNotifications(client)).toEqual([]);
  });

  it("a sale at a favorite store sends one store alert per week", async () => {
    const { client } = await createTestUser();
    await setFavoriteStore(client, "Mejuri", true);
    const hoops = await newItem(client, { store_brand: "mejuri " });
    const chain = await newItem(client, { store_brand: "Mejuri" });
    const other = await newItem(client, { store_brand: "Aritzia" });

    await recordPriceCheck(client, hoops.id, { price: 100, salePrice: 95 });
    await recordPriceCheck(client, chain.id, { price: 100, salePrice: 50 });
    await recordPriceCheck(client, other.id, { price: 100, salePrice: 95 });

    const storeAlerts = (await listNotifications(client)).filter(
      (n) => n.kind === "store_sale",
    );
    expect(storeAlerts).toEqual([
      expect.objectContaining({
        title: "Mejuri is having a sale",
        body: "Sneakers is 5% off.",
        url: "/?store=mejuri",
      }),
    ]);
  });

  it("users read, open and mark only their own alerts; they can't create them", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const item = await newItem(owner.client);
    await recordPriceCheck(owner.client, item.id, {
      price: 100,
      salePrice: 50,
    });
    const [alert] = await listNotifications(owner.client);

    expect(await listNotifications(other.client)).toEqual([]);
    expect(await openNotification(other.client, alert.id)).toBeNull();
    expect(await countUnreadNotifications(owner.client)).toBe(1);

    expect(await openNotification(owner.client, alert.id)).toBe(
      `/items/${item.id}/edit`,
    );
    expect(await countUnreadNotifications(owner.client)).toBe(0);

    // Only read_at is writable
    const { error: titleError } = await owner.client
      .from("notifications")
      .update({ title: "hacked" })
      .eq("id", alert.id);
    expect(titleError).not.toBeNull();

    const { error: insertError } = await owner.client
      .from("notifications")
      .insert({
        user_id: owner.userId,
        kind: "price_drop",
        title: "x",
        body: "x",
        url: "/",
      });
    expect(insertError).not.toBeNull();

    await markAllNotificationsRead(owner.client);
  });

  it("a device's push subscription belongs to whoever enabled it last", async () => {
    const first = await createTestUser();
    const second = await createTestUser();
    const sub = {
      endpoint: `https://push.example/${crypto.randomUUID()}`,
      p256dh: "key",
      auth: "secret",
    };

    await savePushSubscription(first.client, sub);
    await savePushSubscription(first.client, { ...sub, auth: "rotated" });
    const mine = await first.client.from("push_subscriptions").select("auth");
    expect(mine.data).toEqual([{ auth: "rotated" }]);

    await savePushSubscription(second.client, sub);
    expect(
      (await first.client.from("push_subscriptions").select("id")).data,
    ).toEqual([]);
    expect(
      (await second.client.from("push_subscriptions").select("id")).data,
    ).toHaveLength(1);

    // Can't delete someone else's (no error, nothing removed)
    await deletePushSubscription(first.client, sub.endpoint);
    expect(
      (await second.client.from("push_subscriptions").select("id")).data,
    ).toHaveLength(1);
    await deletePushSubscription(second.client, sub.endpoint);
    expect(
      (await second.client.from("push_subscriptions").select("id")).data,
    ).toEqual([]);
  });
});
