import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
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

async function main() {
  loadEnvFile();

  const [, , emailArg, fullNameArg, passwordArg] = process.argv;
  const email = emailArg?.trim().toLowerCase() ?? "";
  const fullName = fullNameArg?.trim() ?? "";
  const password = passwordArg ?? "";

  if (!email || !password || password.length < 8) {
    console.error("Usage: node scripts/create-user.mjs <email> <full-name> <password>");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("Missing DATABASE_URL in environment or .env.local");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  const passwordHash = await bcrypt.hash(password, 12);

  await sql`
    insert into app_users (email, password_hash, full_name)
    values (${email}, ${passwordHash}, ${fullName})
    on conflict (email) do update
    set
      password_hash = excluded.password_hash,
      full_name = excluded.full_name,
      updated_at = now()
  `;

  await sql.end({ timeout: 1 });
  console.log(`User ready: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
