import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureClientSession } from "@/lib/auth/ensure-client-session";

export async function syncAuthAfterLogin(supabase: SupabaseClient) {
  await ensureClientSession(supabase);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch("/api/auth/cleanup-metadata", { method: "POST", cache: "no-store" });

    if (response.ok) {
      break;
    }

    if (response.status === 401 && attempt < 4) {
      await supabase.auth.refreshSession();
      await new Promise((resolve) => window.setTimeout(resolve, 160 * (attempt + 1)));
      continue;
    }

    break;
  }

  await supabase.auth.refreshSession();
  await ensureClientSession(supabase);

  const accessResponse = await fetch("/api/auth/access", { method: "POST", cache: "no-store" });
  const accessPayload = await accessResponse.json() as { ok?: boolean; allowed?: boolean; message?: string };

  if (!accessResponse.ok || !accessPayload.ok) {
    throw new Error(accessPayload.message ?? "Cannot verify account access.");
  }

  if (!accessPayload.allowed) {
    await supabase.auth.signOut();
    throw new Error("ACCOUNT_PENDING_APPROVAL");
  }
}
