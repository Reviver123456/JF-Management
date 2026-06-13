"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useUi } from "@/lib/i18n";

export type AlertTone = "error" | "info" | "success";
export type AlertVariant = "default" | "status";

function LoadingPopupContent({
  message,
  progress
}: {
  message?: string;
  progress?: number;
}) {
  const [animatedProgress, setAnimatedProgress] = useState(8);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAnimatedProgress((current) => Math.min(92, current + Math.max(1, Math.round((92 - current) * 0.12))));
    }, 160);

    return () => window.clearInterval(interval);
  }, []);

  const displayProgress = progress ?? animatedProgress;

  return (
    <div
      aria-label={message ?? "Loading"}
      aria-live="polite"
      className="appPopupOverlay appPopupOverlayLoading"
      role="status"
    >
      <article className="appPopupCard appPopupCardLoading">
        <Image
          alt=""
          aria-hidden="true"
          className="appPopupBrandLogo"
          height={62}
          priority
          src="/report-templates/LOGO-JF.webp"
          width={132}
        />
        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(displayProgress)}
          className="appPopupProgressTrack"
          role="progressbar"
        >
          <span style={{ width: `${Math.max(6, Math.min(100, displayProgress))}%` }} />
        </div>
        <p>{message ?? "Loading"}</p>
      </article>
    </div>
  );
}

export function LoadingPopup({
  message,
  open,
  progress
}: {
  message?: string;
  open: boolean;
  progress?: number;
}) {
  if (!open) {
    return null;
  }

  return <LoadingPopupContent key={`${message ?? "loading"}-${progress ?? "auto"}`} message={message} progress={progress} />;
}

function AlertPopupContent({
  message,
  onClose,
  title,
  tone = "info",
  variant = "default"
}: {
  message: string;
  onClose: () => void;
  title?: string;
  tone?: AlertTone;
  variant?: AlertVariant;
}) {
  const [dismissProgress, setDismissProgress] = useState(100);

  useEffect(() => {
    const startedAt = Date.now();
    const duration = 3200;
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setDismissProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 40);

    const timeout = window.setTimeout(onClose, duration);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timeout);
    };
  }, [onClose]);

  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertTriangle : Info;
  const isStatus = variant === "status";

  return (
    <div
      aria-label={title ?? message}
      aria-modal="true"
      className="appPopupOverlay appPopupOverlayAlert"
      role="alertdialog"
    >
      <article className={`appPopupCard appPopupCardAlert ${tone}${isStatus ? " appPopupCardAlertStatus" : ""}`}>
        <button aria-label="Close" className="appPopupCloseButton" type="button" onClick={onClose}>
          <X size={16} />
        </button>

        {isStatus ? (
          <div className="appPopupStatusBody">
            <span className="appPopupStatusIcon">
              <Icon size={30} />
            </span>
            {title ? <h2>{title}</h2> : null}
            <p>{message}</p>
          </div>
        ) : (
          <header>
            <span>
              <Icon size={20} />
            </span>
            <div>
              {title ? <h2>{title}</h2> : null}
              <p>{message}</p>
            </div>
          </header>
        )}

        <span
          aria-hidden="true"
          className="appPopupAlertBar"
          style={{ transform: `scaleX(${dismissProgress / 100})` }}
        />
      </article>
    </div>
  );
}

export function AlertPopup({
  message,
  onClose,
  open,
  title,
  tone = "info",
  variant = "default"
}: {
  message: string;
  onClose: () => void;
  open: boolean;
  title?: string;
  tone?: AlertTone;
  variant?: AlertVariant;
}) {
  if (!open || !message) {
    return null;
  }

  return (
    <AlertPopupContent
      key={message}
      message={message}
      title={title}
      tone={tone}
      variant={variant}
      onClose={onClose}
    />
  );
}

export function FeedbackPopups({
  alertMessage,
  alertTitle,
  alertTone = "error",
  alertVariant = "default",
  loading,
  loadingMessage,
  loadingProgress
}: {
  alertMessage?: string | null;
  alertTitle?: string;
  alertTone?: AlertTone;
  alertVariant?: AlertVariant;
  loading?: boolean;
  loadingMessage?: string;
  loadingProgress?: number;
}) {
  const { t } = useUi();
  const [dismissedMessage, setDismissedMessage] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const message = alertMessage ?? "";

  useEffect(() => {
    if (!loading) {
      const frame = window.requestAnimationFrame(() => {
        setShowLoading(false);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const timer = window.setTimeout(() => setShowLoading(true), 280);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const resolvedTitle = alertTitle ?? (
    alertVariant === "status"
      ? alertTone === "success"
        ? t("feedback.saveSuccess")
        : alertTone === "error"
          ? t("feedback.saveFailed")
          : t("feedback.notice")
      : undefined
  );

  return (
    <>
      <LoadingPopup message={loadingMessage} open={showLoading} progress={loadingProgress} />
      <AlertPopup
        message={message}
        open={Boolean(message) && !loading && dismissedMessage !== message}
        title={resolvedTitle}
        tone={alertTone}
        variant={alertVariant}
        onClose={() => setDismissedMessage(message)}
      />
    </>
  );
}
