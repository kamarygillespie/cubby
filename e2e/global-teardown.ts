import { deleteLocalTestUsers } from "../src/lib/db/delete-test-users";

// Catches accounts a failed or interrupted test didn't get to delete.
export default async function globalTeardown() {
  await deleteLocalTestUsers();
}
