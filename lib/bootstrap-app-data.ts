import { cachePmData, cacheUserProfile, markBootstrapComplete } from "@/lib/app-bootstrap-cache";
import { fetchClientSession } from "@/lib/auth/client-session";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import type { PmAppData } from "@/lib/pm-data";

function resolveUserName(fullName: string, email: string) {
  if (fullName.trim()) {
    return fullName.trim();
  }

  return email;
}

export async function bootstrapAppData(onProgress?: (value: number) => void) {
  onProgress?.(8);

  const [user, pmResponse, signatureResponse] = await Promise.all([
    fetchClientSession(),
    fetch("/api/pm-data", { cache: "no-store" }),
    fetch("/api/auth/signature", { cache: "no-store" })
  ]);

  onProgress?.(55);

  const pmPayload = await pmResponse.json() as PmAppData | { message?: string };

  if (!pmResponse.ok) {
    throw new Error("message" in pmPayload && pmPayload.message ? pmPayload.message : "Cannot load PM data.");
  }

  onProgress?.(78);

  const userEmail = user.email;
  const localSignature = window.localStorage.getItem(getUserSignatureStorageKey(userEmail)) ?? "";
  let signature = localSignature;

  try {
    const signaturePayload = await signatureResponse.json() as { signature?: string };

    if (signatureResponse.ok && signaturePayload.signature) {
      signature = signaturePayload.signature;
      window.localStorage.setItem(getUserSignatureStorageKey(userEmail), signature);
    }
  } catch {
    // Keep local signature fallback when profile API is unavailable.
  }

  onProgress?.(95);

  const profile = {
    email: userEmail,
    signature,
    userName: resolveUserName(user.fullName, userEmail)
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
