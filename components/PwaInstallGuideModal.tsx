"use client";

import Image from "next/image";
import { MonitorSmartphone, X } from "lucide-react";
import { useUi } from "@/lib/i18n";

export function PwaInstallGuideModal({
  mode,
  open,
  onClose
}: {
  mode: "ios" | "desktop";
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useUi();

  if (!open) {
    return null;
  }

  const title = mode === "ios" ? t("settings.installIosTitle") : t("settings.installDesktopTitle");

  return (
    <div className="pwaGuideOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <article className="pwaGuideModal">
        <div className="pwaGuideHeader">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        <div className="pwaGuideBody">
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

        <div className="pwaGuideFooter">
          <button className="button primary" type="button" onClick={onClose}>
            {t("settings.installIosClose")}
          </button>
        </div>
      </article>
    </div>
  );
}
