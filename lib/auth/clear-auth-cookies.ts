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
