import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const TEAM = [
  ["visarut@jfav.co.th", "Visarut", "Zero1234"],
  ["werawong.p@jfav.co.th", "Werawong", "0123456789"],
  ["sarawut_l@jfav.co.th", "Sarawut", "0123456789"],
  ["natthawat@jfav.co.th", "Natthawat", "0123456789"]
];

function runCreateUser(email, fullName, password) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/create-user.mjs", email, fullName, password],
      {
        env: process.env,
        stdio: "inherit"
      }
    );

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`create-user failed for ${email} (exit ${code})`));
    });
  });
}

async function main() {
  loadEnvFile();

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("Missing DATABASE_URL. Example:");
    console.error('  export DATABASE_URL="postgresql://..."');
    console.error("  npm run db:init");
    console.error("  npm run db:seed-team");
    process.exit(1);
  }

  for (const [email, fullName, password] of TEAM) {
    await runCreateUser(email, fullName, password);
  }

  console.log("All team users ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
