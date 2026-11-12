import { cachePmData, cacheUserProfile, markBootstrapComplete } from "@/lib/app-bootstrap-cache";
import { ensureClientSession } from "@/lib/auth/ensure-client-session";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import type { PmAppData } from "@/lib/pm-data";
import { createClient } from "@/lib/supabase/client";

function resolveUserName(metadata: Record<string, unknown>, email: string) {
  const fullName = metadata.full_name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  return email;
}

export async function bootstrapAppData(onProgress?: (value: number) => void) {
  onProgress?.(10);

  const supabase = createClient();

  onProgress?.(18);
  const user = await ensureClientSession(supabase);

  onProgress?.(32);

  const pmResponse = await fetch("/api/pm-data", { cache: "no-store" });

  onProgress?.(42);

  const pmPayload = await pmResponse.json() as PmAppData | { message?: string };

  if (!pmResponse.ok) {
    throw new Error("message" in pmPayload && pmPayload.message ? pmPayload.message : "Cannot load PM data.");
  }

  onProgress?.(68);

  const userEmail = user.email ?? "";
  if (!userEmail) {
    throw new Error("Cannot verify signed-in user.");
  }
  const metadata = user.user_metadata ?? {};
  const localSignature = window.localStorage.getItem(getUserSignatureStorageKey(userEmail)) ?? "";
  let signature = localSignature;

  try {
    const signatureResponse = await fetch("/api/auth/signature", { cache: "no-store" });
    const signaturePayload = await signatureResponse.json() as { signature?: string };

    if (signatureResponse.ok && signaturePayload.signature) {
      signature = signaturePayload.signature;
      window.localStorage.setItem(getUserSignatureStorageKey(userEmail), signature);
    }
  } catch {
    // Keep local signature fallback when profile API is unavailable.
  }

  onProgress?.(86);

  const profile = {
    email: userEmail,
    signature,
    userName: resolveUserName(metadata, userEmail)
  };

  cachePmData(pmPayload as PmAppData);
  cacheUserProfile(profile);
  markBootstrapComplete();

  onProgress?.(100);

  return {
    pmData: pmPayload as PmAppData,
    profile
  };
}
