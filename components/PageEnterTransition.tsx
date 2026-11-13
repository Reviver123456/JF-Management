"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";

/** Matches `pageEnterMacOpen` duration in ui.css — keep in sync for dashboard stagger. */
export const PAGE_ENTER_MAC_MS = 820;

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function macOpenClassName() {
  return prefersReducedMotion() ? "pageEnterSurface" : "pageEnterSurface pageEnterSurface--macOpen";
}

export function usePageEnterVisible(resetKey = "", enabled = true) {
  const animationToken = `${resetKey}:${enabled ? "on" : "off"}`;
  const skipMotion = !enabled || prefersReducedMotion();
  const [ready, setReady] = useState({
    token: animationToken,
    value: skipMotion
  });

  if (ready.token !== animationToken) {
    const nextValue = skipMotion;
    setReady({ token: animationToken, value: nextValue });
  }

  useLayoutEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setReady((current) => (
          current.token === animationToken ? { ...current, value: true } : current
        ));
      }
    }, PAGE_ENTER_MAC_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [animationToken, enabled]);

  return !enabled || ready.value;
}

function PageEnterSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className={macOpenClassName()}>
      {children}
    </div>
  );
}

export function PageEnterTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <PageEnterSurface key={pathname}>
      {children}
    </PageEnterSurface>
  );
}

export function usePageEnterProps(className = "") {
  return {
    className: [className, macOpenClassName()].filter(Boolean).join(" ")
  } as const;
}
