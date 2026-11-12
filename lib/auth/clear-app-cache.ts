const authCookiePrefixes = ["sb-", "sb-auth"];
const preservedLocalStorageKeys = new Set(["pm-site-lang", "pm-site-theme"]);
const signatureStoragePrefix = "pm-site-user-signature:";
const checklistStorageKey = "pm-site-checklist-configs";

export function isBrowserStorageQuotaError(value: unknown) {
  if (value instanceof DOMException && value.name === "QuotaExceededError") {
    return true;
  }

  if (value instanceof Error && /quota has been exceeded/i.test(value.message)) {
    return true;
  }

  return typeof value === "string" && /quota has been exceeded/i.test(value);
}

export function clearHeavyLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key) {
      continue;
    }

    if (key.startsWith(signatureStoragePrefix) || key === checklistStorageKey) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

function shouldPreserveLocalStorageKey(key: string, preserveAuth: boolean) {
  if (preservedLocalStorageKeys.has(key)) {
    return true;
  }

  return preserveAuth && key.startsWith("sb-");
}

export function clearLocalStoragePreservingPreferences(options?: { preserveAuth?: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  const preserveAuth = options?.preserveAuth ?? false;
  const preserved = new Map<string, string>();

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !shouldPreserveLocalStorageKey(key, preserveAuth)) {
      continue;
    }

    const value = window.localStorage.getItem(key);

    if (value !== null) {
      preserved.set(key, value);
    }
  }

  window.localStorage.clear();

  for (const [key, value] of preserved) {
    window.localStorage.setItem(key, value);
  }
}

export function clearSupabaseAuthCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const cookieNames = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("=")[0])
    .filter((name) => authCookiePrefixes.some((prefix) => name.startsWith(prefix)));

  for (const name of cookieNames) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

export function getAuthCookieSize() {
  if (typeof document === "undefined") {
    return 0;
  }

  return document.cookie
    .split(";")
    .reduce((total, entry) => {
      const name = entry.trim().split("=")[0];
      return authCookiePrefixes.some((prefix) => name.startsWith(prefix))
        ? total + entry.length
        : total;
    }, 0);
}

export async function clearBrowserCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

export function clearSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.clear();
}

export type ClearAppBrowserCacheOptions = {
  includeLocalStorage?: boolean | "heavy";
  /** Keep Supabase auth cookies and `sb-*` localStorage entries (use while bootstrapping). */
  preserveAuth?: boolean;
};

export async function clearAppBrowserCache(options?: ClearAppBrowserCacheOptions) {
  if (!options?.preserveAuth) {
    clearSupabaseAuthCookies();
  }

  clearSessionStorage();

  if (options?.includeLocalStorage === "heavy") {
    clearHeavyLocalStorage();
  } else if (options?.includeLocalStorage) {
    clearLocalStoragePreservingPreferences({ preserveAuth: options.preserveAuth });
  }

  await clearBrowserCaches();
}
