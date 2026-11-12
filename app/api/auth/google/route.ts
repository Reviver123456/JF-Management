import { NextResponse } from "next/server";
import {
  attachGoogleOAuthStateCookie,
  clearSessionCookie
} from "@/lib/auth/session";
import {
  buildGoogleAuthUrl,
  createGoogleOAuthState,
  getAppBaseUrl,
  hashGoogleOAuthState,
  hasGoogleOAuthConfig
} from "@/lib/auth/google-oauth";

export async function GET() {
  if (!hasGoogleOAuthConfig()) {
    return NextResponse.redirect(new URL("/login?error=google_config", getAppBaseUrl()));
  }

  const state = createGoogleOAuthState();
  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  clearSessionCookie(response);
  attachGoogleOAuthStateCookie(response, hashGoogleOAuthState(state));
  return response;
}
