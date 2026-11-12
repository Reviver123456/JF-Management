import { safeLocalSetItem } from "@/lib/browser-storage";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";

/** Skip persisting huge base64 signatures in localStorage (fetch from API instead). */
const MAX_LOCAL_SIGNATURE_CHARS = 24_000;

export function readUserSignatureLocal(email: string) {
  if (typeof window === "undefined" || !email) {
    return "";
  }

  return window.localStorage.getItem(getUserSignatureStorageKey(email)) ?? "";
}

export function writeUserSignatureLocal(email: string, signature: string) {
  if (typeof window === "undefined" || !email) {
    return;
  }

  const key = getUserSignatureStorageKey(email);

  if (!signature || signature.length > MAX_LOCAL_SIGNATURE_CHARS) {
    window.localStorage.removeItem(key);
    return;
  }

  safeLocalSetItem(key, signature);
}
