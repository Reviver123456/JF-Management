const authCookiePrefixes = ["sb-", "sb-auth"];

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

export async function clearAppBrowserCache() {
  clearSupabaseAuthCookies();
  clearSessionStorage();
  await clearBrowserCaches();
}
