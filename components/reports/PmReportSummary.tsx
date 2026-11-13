"use client";

import { useMemo } from "react";
import { useUi } from "@/lib/i18n";
import type { ReportRow } from "@/lib/pm-data";
import { ReportStatSummary } from "@/components/reports/ReportStatSummary";

export function PmReportSummary({ reports }: { reports: ReportRow[] }) {
  const { t } = useUi();

  const summary = useMemo(() => {
    const siteIds = new Set(reports.map((row) => row.siteId));

    return {
      total: reports.length,
      normal: reports.filter((row) => row.result === "ปกติ").length,
      abnormal: reports.filter((row) => row.result === "ผิดปกติ").length,
      sites: siteIds.size
    };
  }, [reports]);

  return (
    <ReportStatSummary
      columns={4}
      items={[
        { label: t("reports.pmTotal"), value: summary.total },
        { label: t("common.normal"), value: summary.normal, tone: "success" },
        { label: t("common.abnormal"), value: summary.abnormal, tone: "warning" },
        { label: t("reports.pmSiteCount"), value: summary.sites }
      ]}
    />
  );
}
