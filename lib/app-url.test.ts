import { describe, expect, it } from "vitest";

import { resolveAppOriginFromRequest, resolveAuthCallbackUrlFromRequest } from "@/lib/app-url";

function makeRequest(options: {
  appUrl?: string;
  forwardedHost?: string;
  forwardedProto?: string;
  host?: string;
  nextOrigin?: string;
}) {
  const headers = new Headers();

  if (options.forwardedHost) {
    headers.set("x-forwarded-host", options.forwardedHost);
  }

  if (options.forwardedProto) {
    headers.set("x-forwarded-proto", options.forwardedProto);
  }

  if (options.host) {
    headers.set("host", options.host);
  }

  if (options.appUrl) {
    process.env.NEXT_PUBLIC_APP_URL = options.appUrl;
  } else {
    delete process.env.NEXT_PUBLIC_APP_URL;
  }

  return {
    headers,
    nextUrl: new URL(options.nextOrigin ?? "https://fallback.example/login")
  };
}

describe("resolveAppOriginFromRequest", () => {
  it("uses NEXT_PUBLIC_APP_URL when it is a production host", () => {
    const request = makeRequest({
      appUrl: "https://jf-management.onrender.com",
      forwardedHost: "wrong.example"
    });

    expect(resolveAppOriginFromRequest(request)).toBe("https://jf-management.onrender.com");
    expect(resolveAuthCallbackUrlFromRequest(request)).toBe(
      "https://jf-management.onrender.com/auth/callback"
    );
  });

  it("ignores localhost NEXT_PUBLIC_APP_URL and uses proxy headers", () => {
    const request = makeRequest({
      appUrl: "http://localhost:3000",
      forwardedHost: "jf-management.onrender.com",
      forwardedProto: "https"
    });

    expect(resolveAppOriginFromRequest(request)).toBe("https://jf-management.onrender.com");
  });

  it("falls back to forwarded host when env URL is unset", () => {
    const request = makeRequest({
      forwardedHost: "jf-management.onrender.com",
      forwardedProto: "https"
    });

    expect(resolveAppOriginFromRequest(request)).toBe("https://jf-management.onrender.com");
  });
});