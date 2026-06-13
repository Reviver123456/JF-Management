"use client";

import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useUi } from "@/lib/i18n";
import { usePwaInstall } from "@/lib/pwa/use-pwa-install";

export function PwaInstallSection({
  onShowGuide
}: {
  onShowGuide: (mode: "ios" | "desktop") => void;
}) {
  const { t } = useUi();
  const { install, isInstalled } = usePwaInstall();

  const handleInstall = async () => {
    if (isInstalled) {
      return;
    }

    const result = await install();

    if (result.status === "ios-guide") {
      onShowGuide("ios");
      return;
    }

    if (result.status === "desktop-guide") {
      onShowGuide("desktop");
    }
  };

  return (
    <article className="card pwaInstallCard">
      <h2>
        <Smartphone size={17} /> {t("settings.installApp")}
      </h2>

      {isInstalled ? (
        <div className="pwaInstallStatus">
          <CheckCircle2 size={18} />
          <span>{t("settings.installInstalled")}</span>
        </div>
      ) : (
        <button className="button primary pwaInstallButton" type="button" onClick={() => void handleInstall()}>
          <Download size={16} />
          {t("settings.installButton")}
        </button>
      )}
    </article>
  );
}
