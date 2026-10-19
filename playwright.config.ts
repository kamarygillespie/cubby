import { defineConfig, devices } from "@playwright/test";

// Critical-path e2e tests (TESTING.md). They run against a production build
// served on its own port, wired to the *local* Supabase stack
// (`supabase start`) — never the hosted project, since the tests sign up
// users and write data. The keys below are the Supabase CLI's fixed
// local-dev defaults, identical for every project and safe to commit.
const PORT = 3100;
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // A production build rather than `next dev`: closer to what ships, and
    // Next won't run a second dev server alongside one already on :3000.
    // CI already ran `npm run build` (with these same env values) as its own
    // step, so it only needs to start the server.
    command: process.env.CI
      ? `npx next start --port ${PORT}`
      : `npm run build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    // Never reuse: an existing server on this port could be pointed at the
    // hosted project.
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON_KEY,
    },
  },
});
