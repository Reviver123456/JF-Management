import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "jf_session";
export const GOOGLE_OAUTH_STATE_COOKIE = "jf_google_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  mustChangePassword: boolean;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing AUTH_SECRET. Add a long random string to .env.local.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string, email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret());

  const userId = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";

  if (!userId || !email) {
    return null;
  }

  return { id: userId, email };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0
  });
  return response;
}

export async function readSessionTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const token = await readSessionTokenFromCookies();

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

function shortLivedCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export function attachGoogleOAuthStateCookie(response: NextResponse, stateHash: string) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, stateHash, shortLivedCookieOptions(600));
  return response;
}

export function readGoogleOAuthStateCookie(request: NextRequest) {
  return request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? "";
}

export function clearGoogleOAuthStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    ...shortLivedCookieOptions(600),
    maxAge: 0
  });
  return response;
}
