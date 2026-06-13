"use client";

import { useLayoutEffect, useState } from "react";

const enterTransition = "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1)";

export function usePageEnterVisible(resetKey = "", enabled = true) {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let innerFrame = 0;

    const frame = window.requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setVisible(true);
        return;
      }

      setVisible(false);
      innerFrame = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setVisible(true);
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [resetKey, enabled]);

  return enabled && visible;
}

function getEnterSurfaceStyle(visible: boolean) {
  return {
    width: "100%",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(36px)",
    transition: enterTransition
  } as const;
}

export function PageEnterTransition({ children }: { children: React.ReactNode }) {
  const visible = usePageEnterVisible();

  return (
    <div className="pageEnterSurface" style={getEnterSurfaceStyle(visible)}>
      {children}
    </div>
  );
}

export function usePageEnterProps(className = "", resetKey = "page") {
  const visible = usePageEnterVisible(resetKey);

  return {
    className: [className, "pageEnterSurface"].filter(Boolean).join(" "),
    style: getEnterSurfaceStyle(visible)
  } as const;
}
