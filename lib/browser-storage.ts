import { clearHeavyLocalStorage, isBrowserStorageQuotaError } from "@/lib/auth/clear-app-cache";

export function recoverBrowserStorageQuota() {
  clearHeavyLocalStorage();

  if (typeof window === "undefined") {
    return;
  }

  const removableSessionPrefixes = ["jf-pm-data-cache", "jf-user-cache"];

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);

    if (key && removableSessionPrefixes.some((prefix) => key === prefix)) {
      window.sessionStorage.removeItem(key);
    }
  }
}

export function safeLocalSetItem(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
    return;
  } catch (error) {
    if (!isBrowserStorageQuotaError(error)) {
      throw error;
    }
  }

  recoverBrowserStorageQuota();

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    if (isBrowserStorageQuotaError(error)) {
      window.localStorage.removeItem(key);
      return;
    }

    throw error;
  }
}

export function safeSessionSetItem(key: string, value: string, maxBytes = 512_000) {
  if (typeof window === "undefined") {
    return;
  }

  if (value.length > maxBytes) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
    return;
  } catch (error) {
    if (!isBrowserStorageQuotaError(error)) {
      throw error;
    }
  }

  recoverBrowserStorageQuota();

  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    if (!isBrowserStorageQuotaError(error)) {
      throw error;
    }
  }
}
