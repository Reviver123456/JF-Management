"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type AlertTone = "error" | "success" | "info";

export function LoadingPopup({
  open,
  message
}: {
  open: boolean;
  message?: string;
}) {
  const [progress, setProgress] = useState(12);
  const dots = useMemo(() => Array.from({ length: 16 }, (_, index) => index), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(96, current + Math.max(1, Math.round((96 - current) * 0.12))));
    }, 170);

    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="appPopupOverlay loadingPopupOverlay" role="status" aria-live="polite" aria-label={message}>
      <div className="loadingPopupCard">
        <div className="loadingPopupRing" aria-hidden="true">
          {dots.map((dot) => (
            <span className="loadingPopupDot" key={dot} style={{ "--dot-index": dot } as CSSProperties} />
          ))}
          <strong>{progress}%</strong>
        </div>
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}

export function AlertPopup({
  open,
  tone = "info",
  title,
  message,
  onClose
}: {
  open: boolean;
  tone?: AlertTone;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  if (!open || !message) {
    return null;
  }

  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertTriangle : Info;

  return (
    <div className="appPopupOverlay" role="alertdialog" aria-modal="true" aria-label={title ?? message}>
      <article className={`alertPopupCard ${tone}`}>
        <header>
          <span>
            <Icon size={20} />
          </span>
          <div>
            {title ? <h2>{title}</h2> : null}
            <p>{message}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
      </article>
    </div>
  );
}

export function FeedbackPopups({
  loading,
  loadingMessage,
  alertMessage,
  alertTone = "error",
  alertTitle
}: {
  loading?: boolean;
  loadingMessage?: string;
  alertMessage?: string | null;
  alertTone?: AlertTone;
  alertTitle?: string;
}) {
  const [dismissedMessage, setDismissedMessage] = useState("");
  const message = alertMessage ?? "";

  return (
    <>
      <LoadingPopup open={Boolean(loading)} message={loadingMessage} />
      <AlertPopup
        open={Boolean(message) && !loading && dismissedMessage !== message}
        tone={alertTone}
        title={alertTitle}
        message={message}
        onClose={() => setDismissedMessage(message)}
      />
    </>
  );
}
