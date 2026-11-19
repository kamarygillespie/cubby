import { deleteLocalTestUsers } from "./src/lib/db/delete-test-users";

// Integration tests create a throwaway account per test; clear them after.
export async function teardown() {
  await deleteLocalTestUsers();
}
