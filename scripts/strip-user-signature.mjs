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

const userId = process.argv[2] ?? "cf056b9f-df82-496e-905a-01ec76003fcb";
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket }
});

const { data, error } = await admin.auth.admin.getUserById(userId);

if (error) {
  console.log("GET_USER_ERROR:", error.message);
  process.exit(1);
}

const metadata = data.user?.user_metadata ?? {};
console.log("BEFORE_KEYS:", Object.keys(metadata).join(", "));
console.log(
  "BEFORE_SIGNATURE:",
  typeof metadata.signature === "string" ? `${metadata.signature.length} chars` : "none"
);

if (typeof metadata.signature !== "string") {
  console.log("NO_SIGNATURE_TO_STRIP");
  process.exit(0);
}

const { signature: removed, ...rest } = metadata;
const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
  user_metadata: {
    ...rest,
    signature: null
  }
});

if (updateError) {
  console.log("UPDATE_ERROR:", updateError.message);
  process.exit(1);
}

console.log("STRIP_OK");

const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.argv[3];
const password = process.argv[4];

if (email && password) {
  const signInResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const signInBody = await signInResponse.json();
  if (signInResponse.ok) {
    const accessToken = signInBody.access_token ?? "";
    const claims = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"));
    console.log("AFTER_ACCESS_TOKEN_BYTES:", Buffer.byteLength(accessToken, "utf8"));
    console.log("AFTER_METADATA_KEYS:", Object.keys(claims.user_metadata ?? {}).join(", "));
    console.log(
      "AFTER_SIGNATURE:",
      typeof claims.user_metadata?.signature === "string"
        ? `${claims.user_metadata.signature.length} chars`
        : "none"
    );
  } else {
    console.log("RELOGIN_ERROR:", signInBody.msg ?? signInBody.message ?? signInResponse.status);
  }
}
