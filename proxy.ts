import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { hasDatabaseConfig } from "@/lib/db/env";

const publicPaths = [
  "/login",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/google/status",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/db/health",
  "/manifest.webmanifest",
  "/sw.js"
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!hasDatabaseConfig() || publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next({ request });
  }

  const session = await getSessionFromRequest(request);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
