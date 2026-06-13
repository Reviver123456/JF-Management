"use client";

import { useCallback, useEffect, useState } from "react";
import { isIosDevice, isStandaloneDisplay, type BeforeInstallPromptEvent } from "@/lib/pwa/platform";

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    let frame = 0;

    frame = window.requestAnimationFrame(() => {
      setIsInstalled(isStandaloneDisplay());
      setIsIos(isIosDevice());
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (isInstalled) {
      return { status: "installed" as const };
    }

    if (isIos) {
      return { status: "ios-guide" as const };
    }

    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        return { status: "accepted" as const };
      }

      return { status: "dismissed" as const };
    }

    return { status: "desktop-guide" as const };
  }, [installPrompt, isInstalled, isIos]);

  return {
    install,
    isInstalled
  };
}
