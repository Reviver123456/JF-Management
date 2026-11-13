"use client";

import { useCallback, useEffect, useRef } from "react";

export const REPORT_PAGE_WIDTH = 794;

export function useReportPreviewScale(enabled = true) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scaleShellRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef<HTMLDivElement | null>(null);

  const updatePreviewScale = useCallback(() => {
    const viewport = viewportRef.current;
    const documentNode = documentRef.current;
    const shell = scaleShellRef.current;

    if (!viewport || !documentNode || !shell) {
      return;
    }

    const availableWidth = Math.max(240, viewport.clientWidth - 12);
    const nextScale = Math.min(1, availableWidth / REPORT_PAGE_WIDTH);

    documentNode.style.width = `${REPORT_PAGE_WIDTH}px`;
    documentNode.style.transformOrigin = "top left";
    documentNode.style.transform = nextScale < 1 ? `scale(${nextScale})` : "none";
    shell.style.width = `${REPORT_PAGE_WIDTH * nextScale}px`;
    shell.style.height = `${documentNode.scrollHeight * nextScale}px`;
  }, []);

  const resetPreviewScale = useCallback(() => {
    const documentNode = documentRef.current;
    const shell = scaleShellRef.current;

    if (!documentNode || !shell) {
      return;
    }

    documentNode.style.removeProperty("transform");
    documentNode.style.removeProperty("transform-origin");
    documentNode.style.width = `${REPORT_PAGE_WIDTH}px`;
    shell.style.removeProperty("width");
    shell.style.removeProperty("height");
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetPreviewScale();
      return;
    }

    const syncScale = () => {
      updatePreviewScale();
      requestAnimationFrame(updatePreviewScale);
    };

    syncScale();

    const settleTimers = [150, 400, 900].map((ms) => window.setTimeout(updatePreviewScale, ms));

    const viewport = viewportRef.current;
    const documentNode = documentRef.current;

    if (!viewport || !documentNode) {
      return () => {
        settleTimers.forEach((id) => window.clearTimeout(id));
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updatePreviewScale();
    });

    resizeObserver.observe(viewport);
    resizeObserver.observe(documentNode);

    const imageNodes = documentNode.querySelectorAll("img");
    imageNodes.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", updatePreviewScale, { once: true });
      }
    });

    window.addEventListener("resize", updatePreviewScale);
    window.visualViewport?.addEventListener("resize", updatePreviewScale);

    return () => {
      settleTimers.forEach((id) => window.clearTimeout(id));
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
      window.visualViewport?.removeEventListener("resize", updatePreviewScale);
    };
  }, [enabled, resetPreviewScale, updatePreviewScale]);

  return { viewportRef, scaleShellRef, documentRef, updatePreviewScale };
}
