import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional .env.local
  }
}

async function ensureDatabase(adminUrl, databaseName) {
  const sql = postgres(adminUrl, { max: 1 });
  const rows = await sql`
    select 1
    from pg_database
    where datname = ${databaseName}
  `;

  if (rows.length === 0) {
    await sql.unsafe(`create database ${databaseName.replace(/[^a-zA-Z0-9_]/g, "")}`);
    console.log(`Created database: ${databaseName}`);
  }

  await sql.end({ timeout: 1 });
}

async function applySchema(databaseUrl) {
  const schemaPath = resolve(process.cwd(), "db/schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf8");
  const sql = postgres(databaseUrl, { max: 1 });
  const exists = await sql`select to_regclass('public.app_users') as table_name`;

  if (!exists[0]?.table_name) {
    await sql.unsafe(schemaSql);
    console.log("Applied db/schema.sql");
  }

  await sql.end({ timeout: 1 });
}

async function main() {
  loadEnvFile();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("Missing DATABASE_URL in environment or .env.local");
    process.exit(1);
  }

  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "") || "jf_management";
  url.pathname = "/postgres";
  const adminUrl = url.toString();

  await ensureDatabase(adminUrl, databaseName);
  await applySchema(databaseUrl);

  console.log("Database is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
