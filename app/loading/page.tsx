"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { bootstrapAppData } from "@/lib/bootstrap-app-data";
import { useUi } from "@/lib/i18n";

export default function LoadingPage() {
  const router = useRouter();
  const { t } = useUi();
  const [progress, setProgress] = useState(4);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  const runBootstrap = useCallback(async () => {
    setError("");
    setProgress(4);

    const startedAt = Date.now();

    try {
      await bootstrapAppData((value) => setProgress(value));

      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, 900 - elapsed);

      if (waitMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : t("bootstrap.error"));
      setProgress(0);
    }
  }, [router, t]);

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
      onRetry={error ? runBootstrap : undefined}
      progress={progress}
      retryLabel={t("bootstrap.retry")}
    />
  );
}
