import { createHash, randomBytes } from "node:crypto";
import { getAppBaseUrl } from "@/lib/app-url";

export { getAppBaseUrl };

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || `${getAppBaseUrl()}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  return { clientId, clientSecret, redirectUri };
}

export function hasGoogleOAuthConfig() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function createGoogleOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function hashGoogleOAuthState(state: string) {
  return createHash("sha256").update(state).digest("base64url");
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
};

export async function exchangeGoogleAuthCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  const payload = await response.json() as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Google token exchange failed.");
  }

  return payload.access_token;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await response.json() as GoogleUserInfo;

  if (!response.ok) {
    throw new Error("Cannot load Google account profile.");
  }

  return payload;
}
