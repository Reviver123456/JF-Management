import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
const E2E_SITE_ID = "E2E-SITE-001";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

await admin.from("pm_jobs").delete().eq("site_id", E2E_SITE_ID);
const { count, error } = await admin.from("sites").delete({ count: "exact" }).eq("id", E2E_SITE_ID);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, deletedSites: count ?? 0 }));
