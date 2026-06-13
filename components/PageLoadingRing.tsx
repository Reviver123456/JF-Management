"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const MIN_VISIBLE_MS = 900;

export function PageLoadingRing({
  active,
  message = "Loading"
}: {
  active: boolean;
  message?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(12);
  const dots = useMemo(() => Array.from({ length: 16 }, (_, index) => index), []);

  useEffect(() => {
    if (!active) {
      return;
    }

    let interval = 0;
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
      interval = window.setInterval(() => {
        setProgress((current) => Math.min(96, current + Math.max(1, Math.round((96 - current) * 0.12))));
      }, 170);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [active]);

  useEffect(() => {
    if (active || !visible) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(false);
      setProgress(12);
    }, MIN_VISIBLE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, visible]);

  if (typeof document === "undefined" || !visible) {
    return null;
  }

  return createPortal(
    <div
      aria-label={message}
      aria-live="polite"
      className="pageLoadingOverlay"
      role="status"
    >
      <div className="pageLoadingCard">
        <div aria-hidden="true" className="pageLoadingRing">
          {dots.map((dot) => (
            <span className="pageLoadingDot" key={dot} style={{ "--dot-index": dot } as CSSProperties} />
          ))}
          <strong>{progress}%</strong>
        </div>
      </div>
    </div>,
    document.body
  );
}
