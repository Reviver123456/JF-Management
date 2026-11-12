import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export async function ensureClientSession(supabase: SupabaseClient, maxAttempts = 6) {
  let lastMessage = "Auth session missing!";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError?.message) {
      lastMessage = sessionError.message;
    }

    if (sessionData.session?.access_token) {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (user?.email && !userError) {
        return user as User;
      }

      if (userError?.message) {
        lastMessage = userError.message;
      }
    }

    if (attempt < maxAttempts - 1) {
      await supabase.auth.refreshSession();
      await new Promise((resolve) => window.setTimeout(resolve, 120 * (attempt + 1)));
    }
  }

  throw new Error(lastMessage);
}
