import { NextResponse, type NextRequest } from "next/server";
import {
  attachSessionCookie,
  clearGoogleOAuthStateCookie,
  createSessionToken,
  readGoogleOAuthStateCookie
} from "@/lib/auth/session";
import {
  exchangeGoogleAuthCode,
  fetchGoogleUserInfo,
  getAppBaseUrl,
  hashGoogleOAuthState,
  hasGoogleOAuthConfig
} from "@/lib/auth/google-oauth";
import { getUserByEmail } from "@/lib/auth/users";

function loginRedirect(path: string) {
  return NextResponse.redirect(new URL(path, getAppBaseUrl()));
}

export async function GET(request: NextRequest) {
  if (!hasGoogleOAuthConfig()) {
    return loginRedirect("/login?error=google_config");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const stateCookie = readGoogleOAuthStateCookie(request);

  if (oauthError || !code || !state) {
    return loginRedirect("/login?error=google_cancelled");
  }

  if (!stateCookie || stateCookie !== hashGoogleOAuthState(state)) {
    const badState = loginRedirect("/login?error=google_state");
    clearGoogleOAuthStateCookie(badState);
    return badState;
  }

  try {
    const accessToken = await exchangeGoogleAuthCode(code);
    const profile = await fetchGoogleUserInfo(accessToken);
    const email = profile.email?.trim().toLowerCase() ?? "";

    if (!email || profile.email_verified === false) {
      return loginRedirect("/login?error=google_email");
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return loginRedirect("/login?error=not_registered");
    }

    const sessionToken = await createSessionToken(user.id, user.email);
    const response = loginRedirect("/loading");
    attachSessionCookie(response, sessionToken);
    clearGoogleOAuthStateCookie(response);

    return response;
  } catch {
    return loginRedirect("/login?error=google_failed");
  }
}
