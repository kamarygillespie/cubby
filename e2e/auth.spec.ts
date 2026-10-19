import { test, expect } from "@playwright/test";
import { admin } from "../src/lib/db/integration-test-utils";
import { createUser, logIn } from "./fixtures";

test("sign up (with password confirmation), then log out and back in", async ({
  page,
}) => {
  const email = `e2e-signup-${crypto.randomUUID()}@example.com`;
  const password = "e2e-password-123!";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  const passwordField = page.getByLabel("Password", { exact: true });
  await passwordField.fill(password);

  // Show/hide toggle reveals what was typed
  await expect(passwordField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).first().click();
  await expect(passwordField).toHaveAttribute("type", "text");

  // A mismatched confirmation is flagged and blocks submitting
  const confirm = page.getByLabel("Confirm password");
  await confirm.fill("something-else");
  await expect(page.getByText("Passwords don't match.")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign up/i })).toBeDisabled();

  await confirm.fill(password);
  await expect(page.getByText("Passwords don't match.")).toHaveCount(0);
  await page.getByRole("button", { name: /sign up/i }).click();

  // Local Supabase skips email confirmation (supabase/config.toml), so
  // signup signs you straight in — no "check your email" dead end.
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await logIn(page, { id: "", email, password });

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const created = data.users.find((u) => u.email === email);
  if (created) await admin.auth.admin.deleteUser(created.id);
});

test("signed-out visitors are sent to log in, then back", async ({ page }) => {
  const user = await createUser();

  await page.goto("/wishlists");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fwishlists/);

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/wishlists$/);
  await expect(page.getByRole("heading", { name: "Wishlists" })).toBeVisible();

  await admin.auth.admin.deleteUser(user.id);
});
