import { test as base, expect, type Page } from "@playwright/test";
import { admin } from "../src/lib/db/integration-test-utils";

// Seeding goes through the local service-role client (see
// integration-test-utils.ts) so each test controls exactly the data it needs;
// the flows under test are still driven through the real UI.

export type TestUser = { id: string; email: string; password: string };

export async function createUser(): Promise<TestUser> {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  const password = "e2e-password-123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

export async function seedItems(
  userId: string,
  items: { title: string; price?: number; sale_price?: number }[],
) {
  const { data: itemType, error: typeError } = await admin
    .from("item_types")
    .select("id")
    .limit(1)
    .single();
  if (typeError) throw typeError;

  // Same keys on every row: PostgREST sends an explicit NULL (not the column
  // default) for a key that's missing from some rows of a batch insert.
  const { error } = await admin.from("items").insert(
    items.map((item) => ({
      user_id: userId,
      item_type_id: itemType.id,
      title: item.title,
      price: item.price ?? null,
      sale_price: item.sale_price ?? null,
    })),
  );
  if (error) throw error;
}

export async function logIn(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

// Catches layouts wider than the viewport (e.g. an unbreakable long email),
// which on phones means sideways scrolling and misplaced fixed bars.
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

// A fresh signed-in user per test, so tests never share data. `auto`: every
// test using this `test` starts signed in, whether or not it reads `user`.
export const test = base.extend<{ user: TestUser }>({
  user: [
    // Named `provide` rather than Playwright's usual `use`, which the React
    // hooks lint rule mistakes for React's use().
    async ({ page }, provide) => {
      const user = await createUser();
      await logIn(page, user);
      await provide(user);
      await admin.auth.admin.deleteUser(user.id);
    },
    { auto: true },
  ],
});

export { expect };
