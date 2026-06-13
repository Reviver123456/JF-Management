"use client";

import Image from "next/image";
import { ArrowLeft, MonitorSmartphone } from "lucide-react";
import { useUi } from "@/lib/i18n";

export function PwaInstallGuidePage({
  mode,
  onClose
}: {
  mode: "ios" | "desktop";
  onClose: () => void;
}) {
  const { t } = useUi();
  const title = mode === "ios" ? t("settings.installIosTitle") : t("settings.installDesktopTitle");

  return (
    <div className="pwaGuidePage">
      <header className="pwaGuidePageHeader">
        <button aria-label={t("common.back")} className="pwaGuidePageBackButton" type="button" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>{title}</h1>
        </div>
      </header>

      <div className="pwaGuidePageBody">
        {mode === "ios" ? (
          <Image
            alt={title}
            className="pwaGuideImage"
            height={1200}
            priority
            src="/pwa/ios-install-guide.png"
            width={900}
          />
        ) : (
          <div className="pwaGuideSteps">
            <div className="pwaGuideStepsIcon">
              <MonitorSmartphone size={28} />
            </div>
            <ol>
              <li>{t("settings.installDesktopStep1")}</li>
              <li>{t("settings.installDesktopStep2")}</li>
              <li>{t("settings.installDesktopStep3")}</li>
            </ol>
            <p className="pwaGuideNote">{t("settings.installDesktopNote")}</p>
          </div>
        )}
      </div>

      <footer className="pwaGuidePageFooter">
        <button className="button primary" type="button" onClick={onClose}>
          {t("settings.installIosClose")}
        </button>
      </footer>
    </div>
  );
}
