import { assertEquals } from "jsr:@std/assert@1";
import {
  buildDigest,
  runDigest,
  type PendingAlert,
  type Subscription,
} from "./digest.ts";

const alert = (
  id: string,
  user_id: string,
  title = `Item ${id}`,
): PendingAlert => ({
  id,
  user_id,
  title,
  body: "Was $10.00 — 20% less.",
  url: `/items/${id}/edit`,
});

Deno.test("one alert is pushed as is; several are summarized", () => {
  assertEquals(buildDigest([alert("a", "u")]), {
    title: "Item a",
    body: "Was $10.00 — 20% less.",
    url: "/items/a/edit",
    tag: "cubby-digest",
  });
  assertEquals(
    buildDigest([alert("a", "u"), alert("b", "u")]).body,
    "Item a · Item b",
  );
  assertEquals(
    buildDigest([alert("a", "u"), alert("b", "u"), alert("c", "u")]),
    {
      title: "3 price alerts",
      body: "Item a · Item b · and 1 more",
      url: "/notifications",
      tag: "cubby-digest",
    },
  );
});

Deno.test(
  "one push per device per user; expired devices are removed; all alerts marked",
  async () => {
    const sub = (user_id: string, endpoint: string): Subscription => ({
      user_id,
      endpoint,
      p256dh: "k",
      auth: "a",
    });
    const sent: string[] = [];
    const deleted: string[] = [];
    const marked: string[] = [];
    const summary = await runDigest({
      listPending: () =>
        Promise.resolve([
          alert("1", "ana"),
          alert("2", "ana"),
          alert("3", "bo"),
          alert("4", "cy"),
        ]),
      listSubscriptions: () =>
        Promise.resolve([
          sub("ana", "phone"),
          sub("ana", "laptop"),
          sub("bo", "old"),
          sub("cy", "boom"),
        ]),
      send: (s, m) => {
        if (s.endpoint === "boom") throw new Error("network");
        sent.push(`${s.endpoint}:${m.title}`);
        return Promise.resolve(s.endpoint === "old" ? "gone" : "sent");
      },
      deleteSubscription: (e) => {
        deleted.push(e);
        return Promise.resolve();
      },
      markPushed: (ids) => {
        marked.push(...ids);
        return Promise.resolve();
      },
    });
    assertEquals(sent, [
      "phone:2 price alerts",
      "laptop:2 price alerts",
      "old:Item 3",
    ]);
    assertEquals(deleted, ["old"]);
    assertEquals(marked.sort(), ["1", "2", "3", "4"]);
    assertEquals(summary, { users: 3, sent: 2, gone: 1, failed: 1 });
  },
);

Deno.test("nothing pending: nothing sent", async () => {
  let listed = false;
  const summary = await runDigest({
    listPending: () => Promise.resolve([]),
    listSubscriptions: () => {
      listed = true;
      return Promise.resolve([]);
    },
    send: () => Promise.resolve("sent"),
    deleteSubscription: () => Promise.resolve(),
    markPushed: () => Promise.resolve(),
  });
  assertEquals(listed, false);
  assertEquals(summary, { users: 0, sent: 0, gone: 0, failed: 0 });
});
