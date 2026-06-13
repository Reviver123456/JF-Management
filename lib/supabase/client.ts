"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { supabaseCookieOptions, supabaseSsrCookieMethods } from "@/lib/supabase/ssr-options";

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: supabaseSsrCookieMethods
  });
}
