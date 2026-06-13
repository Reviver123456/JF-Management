"use client";

import { useState } from "react";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { PwaInstallGuideModal } from "@/components/PwaInstallGuideModal";
import { useUi } from "@/lib/i18n";
import { usePwaInstall } from "@/lib/pwa/use-pwa-install";

export function PwaInstallSection() {
  const { t } = useUi();
  const { install, isInstalled } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideMode, setGuideMode] = useState<"ios" | "desktop">("ios");

  const handleInstall = async () => {
    if (isInstalled) {
      return;
    }

    const result = await install();

    if (result.status === "ios-guide") {
      setGuideMode("ios");
      setGuideOpen(true);
      return;
    }

    if (result.status === "desktop-guide") {
      setGuideMode("desktop");
      setGuideOpen(true);
    }
  };

  return (
    <>
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

      <PwaInstallGuideModal mode={guideMode} open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
