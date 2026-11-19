import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthCallbackUrlFromRequest, resolveAppOriginFromRequest } from "@/lib/app-url";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { supabaseCookieOptions, supabaseSsrCookieMethods } from "@/lib/supabase/ssr-options";

export async function GET(request: NextRequest) {
  const redirectTo = resolveAuthCallbackUrlFromRequest(request);
  const loginErrorUrl = new URL("/login?error=oauth", resolveAppOriginFromRequest(request));
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

  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: "openid email profile",
      queryParams: {
        access_type: "online",
        prompt: "select_account"
      },
      skipBrowserRedirect: true
    }
  });

  if (error || !data.url) {
    const response = NextResponse.redirect(loginErrorUrl);
    responseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  const response = NextResponse.redirect(data.url);
  responseCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}