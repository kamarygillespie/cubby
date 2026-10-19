import { test, expect } from "@playwright/test";
import { admin } from "../src/lib/db/integration-test-utils";
import { createUser, logIn } from "./fixtures";

test("sign up, then log in and out", async ({ page }) => {
  const email = `e2e-signup-${crypto.randomUUID()}@example.com`;
  const password = "e2e-password-123!";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();

  // Local Supabase skips email confirmation (supabase/config.toml), so the
  // new account can log in straight away.
  await page.context().clearCookies();
  await logIn(page, { id: "", email, password });

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const created = data.users.find((u) => u.email === email);
  if (created) await admin.auth.admin.deleteUser(created.id);
});

test("signed-out visitors are sent to log in, then back", async ({ page }) => {
  const user = await createUser();

  await page.goto("/wishlists");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fwishlists/);

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/wishlists$/);
  await expect(page.getByRole("heading", { name: "Wishlists" })).toBeVisible();

  await admin.auth.admin.deleteUser(user.id);
});
