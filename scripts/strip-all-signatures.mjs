import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket }
});

let page = 1;
let stripped = 0;

while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.log("LIST_ERROR:", error.message);
    process.exit(1);
  }

  for (const user of data.users) {
    const metadata = user.user_metadata ?? {};
    if (typeof metadata.signature !== "string") {
      continue;
    }

    const metadataWithoutSignature = { ...metadata };
    delete metadataWithoutSignature.signature;
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadataWithoutSignature,
        signature: null
      }
    });
    if (updateError) {
      console.log("UPDATE_ERROR:", user.email ?? user.id, updateError.message);
      continue;
    }

    stripped += 1;
    console.log("STRIPPED:", user.email ?? user.id);
  }

  if (data.users.length < 200) {
    break;
  }

  page += 1;
}

console.log("DONE:", stripped, "users updated");
