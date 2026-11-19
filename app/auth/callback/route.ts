import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { canEnterApp, syncUserAccessForSession } from "@/lib/auth/sync-user-access-server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { supabaseCookieOptions, supabaseSsrCookieMethods } from "@/lib/supabase/ssr-options";

function redirectWithCookies(request: NextRequest, path: string, cookiesToSet: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[]) {
  const destination = new URL(path, request.url);
  const redirect = NextResponse.redirect(destination);

  cookiesToSet.forEach(({ name, value, options }) => {
    redirect.cookies.set(name, value, options);
  });

  return redirect;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const { url, publishableKey } = getSupabaseConfig();
  const responseCookies: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      ...supabaseSsrCookieMethods,
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        responseCookies.splice(0, responseCookies.length, ...cookiesToSet);
      }
    }
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectWithCookies(request, "/login?error=oauth", responseCookies);
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirectWithCookies(request, "/login?error=oauth", responseCookies);
  }

  let destination = "/loading";

  try {
    const access = await syncUserAccessForSession(user);

    if (!canEnterApp(access.status)) {
      destination = "/login?access=pending";
    }
  } catch {
    destination = "/login?error=access";
  }

  return redirectWithCookies(request, destination, responseCookies);
}