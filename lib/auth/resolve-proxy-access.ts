import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isGoogleAuthUser } from "@/lib/auth/user-access";
import type { Database } from "@/lib/supabase/database.types";

type AccessClient = SupabaseClient<Database>;

export async function resolveProxyAccess(supabase: AccessClient, user: User) {
  const { data, error } = await supabase
    .from("user_access")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // Table may not exist yet during rollout — keep legacy email logins working.
    if (/relation .*user_access.* does not exist/i.test(error.message)) {
      return { allowed: !isGoogleAuthUser(user), status: null };
    }

    throw error;
  }

  if (!data) {
    return {
      allowed: !isGoogleAuthUser(user),
      status: null
    };
  }

  return {
    allowed: data.status === "approved",
    status: data.status
  };
}