import type { CookieOptionsWithName } from "@supabase/ssr";

export const supabaseCookieOptions: CookieOptionsWithName = {
  name: "sb-auth"
};

export const supabaseSsrCookieMethods = {
  encode: "tokens-only" as const
};
