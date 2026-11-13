"use client";

import { useUi } from "@/lib/i18n";
import type { OperationalOwnerSummarySet } from "@/lib/operational-report-data";

export function OperationalReportOwnerSummary({
  sets
}: {
  sets: OperationalOwnerSummarySet[];
}) {
  const { t } = useUi();

  if (sets.length === 0) {
    return null;
  }

  return (
    <section className="operationalDocOwnerSummary">
      {sets.map((set) => (
        <div className="operationalDocOwnerSummarySet" key={set.owner}>
          <div className="operationalDocOwnerSummaryLine">
            <span>{t("common.owner")}</span>
            <strong>{set.owner}</strong>
          </div>
          <div className="operationalDocOwnerSummaryLine">
            <span>{t("reports.siteTotal")}</span>
            <strong>{`${set.siteCount} ${t("reports.summarySiteUnit")}`}</strong>
          </div>
          <div className="operationalDocOwnerSummaryLine">
            <span>{t("reports.totalDays")}</span>
            <strong>{`${set.dayCount} ${t("reports.summaryDayUnit")}`}</strong>
          </div>
        </div>
      ))}
    </section>
  );
}
