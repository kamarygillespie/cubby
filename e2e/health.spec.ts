import { test, expect } from "@playwright/test";

// The keep-alive / uptime endpoint must answer without a login (Vercel Cron
// and the GitHub health workflow call it anonymously).
test("health check is public and reports the database up", async ({
  request,
}) => {
  const response = await request.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, database: "up" });
});
