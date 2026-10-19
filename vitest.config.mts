import { defaultExclude, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    // Edge Functions run on Deno, not Node — tested separately via
    // `deno test`, not Vitest.
    exclude: [...defaultExclude, "supabase/functions/**"],
  },
});
