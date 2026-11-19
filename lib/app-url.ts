/**
 * OAuth / email redirects must match the tab the user is on.
 * On Render, a mistaken NEXT_PUBLIC_APP_URL=http://localhost:3000 at build time
 * would otherwise send Google sign-in back to localhost.
 */
export function resolveAppOrigin() {
  if (typeof window === "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (!envUrl) {
      return "";
    }

    try {
      return new URL(envUrl).origin;
    } catch {
      return "";
    }
  }

  const liveOrigin = window.location.origin;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!envUrl) {
    return liveOrigin;
  }

  try {
    const envOrigin = new URL(envUrl).origin;
    const envHost = new URL(envOrigin).hostname;
    const liveHost = window.location.hostname;
    const liveIsLocal = liveHost === "localhost" || liveHost === "127.0.0.1";

    if (liveIsLocal) {
      return liveOrigin;
    }

    if (envHost === "localhost" || envHost === "127.0.0.1") {
      return liveOrigin;
    }

    return envOrigin;
  } catch {
    return liveOrigin;
  }
}

export function resolveAuthCallbackUrl() {
  return `${resolveAppOrigin()}/auth/callback`;
}

export function resolveResetPasswordUrl() {
  return `${resolveAppOrigin()}/reset-password`;
}