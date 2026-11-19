import { createClient } from "@supabase/supabase-js";

// Hard-coded on purpose: this cleanup can only ever reach `supabase start` on
// this computer. The key is the Supabase CLI's public local-dev default.
const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Only the throwaway accounts that test runs create.
const TEST_EMAIL =
  /^(test|e2e|e2e-signup)-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}@example\.com$/;

// Removes accounts left by test runs, and their data with them. Does nothing
// when local Supabase isn't running (e.g. a unit-test-only run).
export async function deleteLocalTestUsers(): Promise<number> {
  const admin = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const ids: string[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) return 0;
      ids.push(
        ...data.users
          .filter((user) => TEST_EMAIL.test(user.email ?? ""))
          .map((user) => user.id),
      );
      if (data.users.length < 1000) break;
    }

    for (let i = 0; i < ids.length; i += 20) {
      await Promise.all(
        ids.slice(i, i + 20).map((id) => admin.auth.admin.deleteUser(id)),
      );
    }
    return ids.length;
  } catch {
    return 0;
  }
}
