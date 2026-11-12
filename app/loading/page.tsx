"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { clearAppBrowserCache, isBrowserStorageQuotaError } from "@/lib/auth/clear-app-cache";
import { bootstrapAppData } from "@/lib/bootstrap-app-data";
import { useUi } from "@/lib/i18n";
import { getSupabaseConfigMessage, hasSupabaseConfig } from "@/lib/supabase/env";

export default function LoadingPage() {
  const router = useRouter();
  const { lang, t } = useUi();
  const [progress, setProgress] = useState(4);
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const clearedStorageRef = useRef(false);

  const runBootstrap = useCallback(async (options?: { clearStorage?: boolean }) => {
    setError("");
    setProgress(4);

    const startedAt = Date.now();

    try {
      if (!hasSupabaseConfig()) {
        setError(getSupabaseConfigMessage(lang));
        setProgress(0);
        return;
      }

      if (options?.clearStorage) {
        await clearAppBrowserCache({ includeLocalStorage: true, preserveAuth: true });
        clearedStorageRef.current = true;
      }

      await bootstrapAppData((value) => setProgress(value));

      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, 900 - elapsed);

      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (bootstrapError) {
      const message = bootstrapError instanceof Error ? bootstrapError.message : t("bootstrap.error");

      if (isBrowserStorageQuotaError(bootstrapError)) {
        if (!clearedStorageRef.current) {
          clearedStorageRef.current = true;
          await clearAppBrowserCache({ includeLocalStorage: true, preserveAuth: true });
          await runBootstrap();
          return;
        }

        setError(t("bootstrap.quota"));
        setProgress(0);
        return;
      }

      if (/auth session missing/i.test(message)) {
        window.location.replace("/login");
        return;
      }

      setError(message);
      setProgress(0);
    }
  }, [lang, router, t]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    void runBootstrap();
  }, [runBootstrap]);

  return (
    <AppLoadingScreen
      errorMessage={error || undefined}
      message={t("bootstrap.loading")}
      onRetry={error ? () => void runBootstrap({ clearStorage: true }) : undefined}
      progress={progress}
      retryLabel={t("bootstrap.retry")}
    />
  );
}
