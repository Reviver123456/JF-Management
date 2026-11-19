import type { CookieOptionsWithName } from "@supabase/ssr";

const useSecureCookies = process.env.NODE_ENV === "production";

export const supabaseCookieOptions: CookieOptionsWithName = {
  name: "sb-auth",
  path: "/",
  sameSite: "lax",
  secure: useSecureCookies
};

export const supabaseSsrCookieMethods = {
  encode: "tokens-only" as const
};
