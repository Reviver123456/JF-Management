"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { usePageEnterProps } from "@/components/PageEnterTransition";

export function AppLoadingScreen({
  errorMessage,
  message,
  onRetry,
  progress,
  retryLabel = "ลองใหม่"
}: {
  errorMessage?: string;
  message: string;
  onRetry?: () => void;
  progress: number;
  retryLabel?: string;
}) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const pageEnterProps = usePageEnterProps("appLoadingScreen", "app-loading");
  const clampedProgress = Math.max(4, Math.min(100, progress));

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        setParallax({
          x: (event.clientX / window.innerWidth - 0.5) * 36,
          y: (event.clientY / window.innerHeight - 0.5) * 28
        });
      });
    };

    window.addEventListener("pointermove", handleMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const style = {
    "--px": `${parallax.x}`,
    "--py": `${parallax.y}`
  } as CSSProperties;

  return (
    <main {...pageEnterProps} style={{ ...pageEnterProps.style, ...style }}>
      <div className="appLoadingParallax" aria-hidden="true">
        <span className="appLoadingLayer appLoadingLayerBack" />
        <span className="appLoadingLayer appLoadingLayerMid" />
        <span className="appLoadingLayer appLoadingLayerFront" />
        <span className="appLoadingGrid" />
      </div>

      <div className="appLoadingContent">
        <Image
          alt="JF Advance Med"
          className="appLoadingLogo"
          height={112}
          priority
          src="/report-templates/LOGO-JF.webp"
          width={360}
        />

        <div className="appLoadingProgressWrap">
          <div
            aria-label={message}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(clampedProgress)}
            className="appLoadingProgressTrack"
            role="progressbar"
          >
            <span className="appLoadingProgressFill" style={{ width: `${clampedProgress}%` }} />
          </div>
          <div className="appLoadingProgressMeta">
            <span>{message}</span>
            <strong>{Math.round(clampedProgress)}%</strong>
          </div>
        </div>

        {errorMessage ? (
          <div className="appLoadingError">
            <p>{errorMessage}</p>
            {onRetry ? (
              <button className="button primary" type="button" onClick={onRetry}>
                {retryLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
