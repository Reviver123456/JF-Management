import type { SupabaseClient } from "@supabase/supabase-js";

export type AppAccessState = {
  allowed: boolean;
  status: "approved" | "pending" | "rejected" | null;
};

export async function fetchAppAccessState(): Promise<AppAccessState> {
  const response = await fetch("/api/auth/access", { cache: "no-store" });
  const payload = await response.json() as {
    ok?: boolean;
    allowed?: boolean;
    status?: AppAccessState["status"];
    message?: string;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? "Cannot verify access.");
  }

  return {
    allowed: Boolean(payload.allowed),
    status: payload.status ?? null
  };
}

export async function syncAppAccessAfterLogin() {
  const response = await fetch("/api/auth/access", { method: "POST", cache: "no-store" });
  const payload = await response.json() as {
    ok?: boolean;
    allowed?: boolean;
    status?: AppAccessState["status"];
    message?: string;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? "Cannot sync access.");
  }

  return {
    allowed: Boolean(payload.allowed),
    status: payload.status ?? null
  } satisfies AppAccessState;
}

export async function signOutIfAccessDenied(supabase: SupabaseClient, allowed: boolean) {
  if (!allowed) {
    await supabase.auth.signOut();
  }
}