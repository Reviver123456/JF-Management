"use client";

import Image from "next/image";
import { Building2, CalendarRange } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUi } from "@/lib/i18n";

export function OperationalReportBrandHeader({
  periodLabel,
  reportKind
}: {
  periodLabel: string;
  reportKind: "plan" | "site";
}) {
  const { t } = useUi();
  const bannerTitle = reportKind === "plan"
    ? t("reports.operationalDocument.planTitle")
    : t("reports.operationalDocument.siteTitle");
  const TitleIcon: LucideIcon = reportKind === "plan" ? CalendarRange : Building2;

  return (
    <>
      <header className="templateBrandHeader templateBrandHeaderSheetCenter templateBrandHeaderOperational">
        <div className="reportBrandLogoSlot">
          <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={118} height={55} />
        </div>
        <p className="templateBrandText reportBrandTitleCenter">
          <strong>JF Advance Med CO., LTD</strong>
          <span>{t("reports.operationalDocument.subtitle")}</span>
        </p>
        <div className="operationalDocPeriodCard reportBrandAside">
          <span className="operationalDocPeriodCardLabel">{t("reports.operationalDocument.timePeriod")}</span>
          <strong>{periodLabel}</strong>
        </div>
      </header>
      <div className="templateTitleBanner operationalReportTitleBanner">
        <span className="templateTitleBannerIcon" aria-hidden="true">
          <TitleIcon size={16} />
        </span>
        <strong>{bannerTitle}</strong>
      </div>
    </>
  );
}
