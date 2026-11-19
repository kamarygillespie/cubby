#!/usr/bin/env node
// `npm run dev:local`: runs Cubby against the Supabase stack on this computer.
// Plain `npm run dev` reads .env.local, which points at the live database.
// Extra arguments go to `next dev`, e.g. `npm run dev:local -- --port 3001`.
import { spawn, spawnSync } from "node:child_process";

function localSupabase() {
  const result = spawnSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  const values = Object.fromEntries(
    result.stdout.split("\n").flatMap((line) => {
      const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      return match ? [[match[1], match[2]]] : [];
    }),
  );
  return values.API_URL && values.ANON_KEY ? values : null;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
  fail("Docker isn't running. Open OrbStack, then run this again.");
}

let supabase = localSupabase();
if (!supabase) {
  console.log("Starting local Supabase…");
  spawnSync("npx", ["supabase", "start"], { stdio: "inherit" });
  supabase = localSupabase();
}
if (!supabase) fail("Local Supabase didn't start. Try `npx supabase start`.");

// Never start this command against anything but this computer.
const { hostname } = new URL(supabase.API_URL);
if (hostname !== "127.0.0.1" && hostname !== "localhost") {
  fail(`Refusing to start: ${supabase.API_URL} isn't a local database.`);
}

console.log(`\nUsing the LOCAL database. Dashboard: ${supabase.STUDIO_URL}\n`);

const next = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: supabase.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.ANON_KEY,
    // Local errors shouldn't report to the real Sentry project.
    NEXT_PUBLIC_SENTRY_DSN: "",
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => next.kill(signal));
}
next.on("exit", (code) => process.exit(code ?? 0));
