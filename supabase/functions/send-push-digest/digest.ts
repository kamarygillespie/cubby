// The daily push digest (KAM-54), with I/O injected so it can be tested
// without a network or database (digest.test.ts).
import type { PushResult, PushTarget } from "../_shared/web-push.ts";

export type PendingAlert = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  url: string;
};
export type Subscription = PushTarget & { user_id: string };
export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

// One notification per user per day. A single alert is shown as is; more
// are summarized, and tapping opens the in-app list.
export function buildDigest(
  alerts: Omit<PendingAlert, "id" | "user_id">[],
): PushMessage {
  if (alerts.length === 1) {
    const [a] = alerts;
    return { title: a.title, body: a.body, url: a.url, tag: "cubby-digest" };
  }
  const names = alerts.slice(0, 2).map((a) => a.title);
  const rest = alerts.length - names.length;
  return {
    title: `${alerts.length} price alerts`,
    body: names.join(" · ") + (rest > 0 ? ` · and ${rest} more` : ""),
    url: "/notifications",
    tag: "cubby-digest",
  };
}

export type DigestDeps = {
  listPending: () => Promise<PendingAlert[]>;
  listSubscriptions: (userIds: string[]) => Promise<Subscription[]>;
  send: (sub: Subscription, message: PushMessage) => Promise<PushResult>;
  deleteSubscription: (endpoint: string) => Promise<void>;
  markPushed: (alertIds: string[]) => Promise<void>;
};

export type DigestSummary = {
  users: number;
  sent: number;
  gone: number;
  failed: number;
};

export async function runDigest(deps: DigestDeps): Promise<DigestSummary> {
  const summary: DigestSummary = { users: 0, sent: 0, gone: 0, failed: 0 };
  const pending = await deps.listPending();
  const byUser = new Map<string, PendingAlert[]>();
  for (const alert of pending) {
    byUser.set(alert.user_id, [...(byUser.get(alert.user_id) ?? []), alert]);
  }
  const subs = byUser.size
    ? await deps.listSubscriptions([...byUser.keys()])
    : [];

  for (const [userId, alerts] of byUser) {
    summary.users++;
    const message = buildDigest(alerts);
    for (const sub of subs.filter((s) => s.user_id === userId)) {
      let result: PushResult;
      try {
        result = await deps.send(sub, message);
      } catch {
        result = "failed";
      }
      summary[result]++;
      if (result === "gone") await deps.deleteSubscription(sub.endpoint);
    }
    // Marked even with no devices: the in-app list still has them, and a
    // device added later shouldn't get a backlog.
    await deps.markPushed(alerts.map((a) => a.id));
  }
  return summary;
}
