import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY"
];

function loadEnvFile(filename) {
  const path = resolve(root, filename);

  if (!existsSync(path)) {
    return {};
  }

  const values = {};

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }

  return values;
}

const fromLocal = loadEnvFile(".env.local");
const fromProcess = Object.fromEntries(
  required
    .filter((key) => {
      const value = process.env[key];
      return typeof value === "string" && value.length > 0;
    })
    .map((key) => [key, process.env[key]])
);
const env = { ...fromLocal, ...fromProcess };

if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

const missing = required.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error("\nCopy .env.example to .env.local (local) or add the same keys in Vercel → Settings → Environment Variables.");
  process.exit(1);
}

console.log("Environment check passed.");
