function readConfiguredProductionOrigin() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!envUrl) {
    return "";
  }

  try {
    const origin = new URL(envUrl).origin;
    const host = new URL(origin).hostname;

    if (host === "localhost" || host === "127.0.0.1") {
      return "";
    }

    return origin;
  } catch {
    return "";
  }
}

/**
 * Prefer configured production URL, else infer from proxy headers (Render, etc.).
 */
export type AppOriginRequest = {
  headers: Pick<Headers, "get">;
  nextUrl: { origin: string };
};

export function resolveAppOriginFromRequest(request: AppOriginRequest) {
  const configured = readConfiguredProductionOrigin();

  if (configured) {
    return configured;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host")?.trim();
  const protocol = forwardedProto
    ?? (host && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? "http" : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  return request.nextUrl.origin;
}

export function resolveAuthCallbackUrlFromRequest(request: AppOriginRequest) {
  return `${resolveAppOriginFromRequest(request)}/auth/callback`;
}

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
  const configured = readConfiguredProductionOrigin();

  if (configured && typeof window === "undefined") {
    return `${configured}/auth/callback`;
  }

  return `${resolveAppOrigin()}/auth/callback`;
}

export function resolveResetPasswordUrl() {
  return `${resolveAppOrigin()}/reset-password`;
}