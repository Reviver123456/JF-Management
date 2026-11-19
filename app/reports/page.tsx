"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { AppSelect } from "@/components/AppSelect";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FeedbackPopups } from "@/components/AppPopup";
import { PageLoadingRing } from "@/components/PageLoadingRing";
import { PmChecklistReportPanel } from "@/components/reports/PmChecklistReportPanel";
import type { PreviewState } from "@/lib/reports";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useOwnerFromUrl } from "@/lib/hooks/use-owner-from-url";
import { useUi } from "@/lib/i18n";
import {
  ALL_OWNERS_VALUE,
  buildUniqueOwnerOptions,
  resolveActiveOwner
} from "@/lib/owner-filter";
import type { ReportRow } from "@/lib/pm-data";
import { getPeriodRange, type ReportPeriodType } from "@/lib/report-period";
import { rowMatchesFilters, toInputDate } from "@/lib/reports/pm-report-list-filters";
import { parseReportSection } from "@/lib/report-section-nav";
import { usePmData } from "@/lib/use-pm-data";

const PmReportPreviewPage = dynamic(
  () => import("@/components/reports/PmReportPreviewPage").then((mod) => mod.PmReportPreviewPage),
  {
    loading: () => (
      <div className="reportEditorPage reportEditorPagePreview">
        <PageLoadingRing active />
      </div>
    )
  }
);

const SchedulePlanReportPanel = dynamic(
  () => import("@/components/reports/SchedulePlanReportPanel").then((mod) => mod.SchedulePlanReportPanel),
  { loading: () => <PageLoadingRing active /> }
);

const SiteInventoryReportPanel = dynamic(
  () => import("@/components/reports/SiteInventoryReportPanel").then((mod) => mod.SiteInventoryReportPanel),
  { loading: () => <PageLoadingRing active /> }
);

function getStoredUserSignature(email: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getUserSignatureStorageKey(email)) ?? "";
}

function ReportsPageInner() {
  const { lang, t } = useUi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { email, signature, userName } = useCurrentUser();
  const ownerParam = useOwnerFromUrl();
  const { data, error } = usePmData();
  const reportSection = parseReportSection(searchParams.get("section"));
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pmOwnerFilter, setPmOwnerFilter] = useState("");
  const [pmResultFilter, setPmResultFilter] = useState("");
  const [operationalOwnerFilter, setOperationalOwnerFilter] = useState("");
  const [operationalPeriodType, setOperationalPeriodType] = useState<ReportPeriodType>("daily");
  const [operationalStartDate, setOperationalStartDate] = useState("");
  const [operationalEndDate, setOperationalEndDate] = useState("");
  const [operationalAnchorStart, setOperationalAnchorStart] = useState("");
  const [operationalAnchorEnd, setOperationalAnchorEnd] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const responsibleName = userName.trim() || email || "";
  const responsibleSignature = signature || getStoredUserSignature(email);
  const pmOwner = resolveActiveOwner({
    selectedOwner: pmOwnerFilter,
    ownerParam,
    userName
  });
  const operationalOwner = resolveActiveOwner({
    selectedOwner: operationalOwnerFilter,
    ownerParam,
    userName
  });
  const ownerOptions = useMemo(
    () => buildUniqueOwnerOptions(
      [userName],
      data.owners,
      data.reportRows.flatMap((row) => row.inspector.split(", ")),
      data.pmJobs.map((job) => job.owner),
      data.siteCatalog.map((site) => site.owner)
    ),
    [data.owners, data.pmJobs, data.reportRows, data.siteCatalog, userName]
  );
  const periodRange = useMemo(
    () => getPeriodRange(operationalPeriodType, {
      anchor: "",
      anchorEnd: operationalAnchorEnd,
      anchorStart: operationalAnchorStart,
      dailyEndDate: operationalEndDate,
      dailyStartDate: operationalStartDate
    }),
    [
      operationalAnchorEnd,
      operationalAnchorStart,
      operationalEndDate,
      operationalPeriodType,
      operationalStartDate
    ]
  );

  useEffect(() => {
    if (!searchParams.get("section")) {
      router.replace("/reports?section=pm", { scroll: false });
    }
  }, [router, searchParams]);

  const activePreview = preview?.section === reportSection ? preview : null;

  const filteredReports = useMemo(() => (
    data.reportRows.filter((row) => rowMatchesFilters({
      endDate,
      ownerFilter: pmOwner,
      query,
      result: row.result,
      resultFilter: pmResultFilter,
      rowDate: toInputDate(row.date),
      searchableText: `${row.site} ${row.customer} ${row.inspector} ${row.province}`,
      startDate,
      owners: row.inspector.split(", ")
    }))
  ), [data.reportRows, endDate, pmOwner, pmResultFilter, query, startDate]);
  const openReportPreview = (row: ReportRow, contractIndex?: number) => {
    setPreview({
      contractIndex: contractIndex ?? row.workDetails?.contractIndex ?? 0,
      row,
      section: reportSection,
      site: data.siteCatalog.find((site) => site.id === row.siteId) ?? null,
      title: `รายงาน PM - ${row.site}`
    });
  };
  const handleOperationalPeriodTypeChange = (value: ReportPeriodType) => {
    setOperationalPeriodType(value);

    if (value !== "monthly" && value !== "yearly") {
      return;
    }

    const today = new Date();

    if (value === "monthly" && !operationalAnchorStart && !operationalAnchorEnd) {
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      setOperationalAnchorStart(currentMonth);
      setOperationalAnchorEnd(currentMonth);
      return;
    }

    if (value === "yearly" && !operationalAnchorStart && !operationalAnchorEnd) {
      const currentYear = String(today.getFullYear());
      setOperationalAnchorStart(currentYear);
      setOperationalAnchorEnd(currentYear);
    }
  };

  return (
    <AppShell>
      <div className="reportsPage">
        <FeedbackPopups alertMessage={error} />

        {activePreview ? (
          <PmReportPreviewPage
            pmJobs={data.pmJobs}
            preview={activePreview}
            responsibleName={responsibleName}
            responsibleSignature={responsibleSignature}
            onClose={() => setPreview(null)}
            onContractIndexChange={(contractIndex) => setPreview((current) => current ? { ...current, contractIndex } : current)}
          />
        ) : (
          <>
            <PageTitle
              title={t(`reports.sections.${reportSection}`)}
              subtitle={t("reports.subtitle")}
            />

            {reportSection === "pm" ? (
              <>
                <section className="toolbar reportToolbar">
                  <div className="reportFilterField">
                    <span>{t("common.search")}</span>
                    <SearchControl placeholder={t("reports.searchInput")} value={query} onChange={setQuery} />
                  </div>
                  <label className="reportFilterField reportDateRangeField">
                    <span>{t("common.dateRange")}</span>
                    <DateRangePicker
                      endDate={endDate}
                      startDate={startDate}
                      onEndDateChange={setEndDate}
                      onStartDateChange={setStartDate}
                    />
                  </label>
                  <label className="reportFilterField">
                    <span>{t("common.status")}</span>
                    <AppSelect className="select" value={pmResultFilter} onChange={(event) => setPmResultFilter(event.target.value)}>
                      <option value="">{t("common.all")}</option>
                      <option value="ปกติ">{t("common.normal")}</option>
                      <option value="ผิดปกติ">{t("common.abnormal")}</option>
                    </AppSelect>
                  </label>
                  <label className="reportFilterField">
                    <span>{t("common.inspector")}</span>
                    <AppSelect className="select" firstNameOnly value={pmOwnerFilter || userName} onChange={(event) => setPmOwnerFilter(event.target.value)}>
                      <option value={ALL_OWNERS_VALUE}>{t("common.all")}</option>
                      {ownerOptions.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </AppSelect>
                  </label>
                </section>

                <PmChecklistReportPanel
                  filteredReports={filteredReports}
                  lang={lang}
                  onPreviewReport={openReportPreview}
                />
              </>
            ) : null}

            {reportSection === "plan" ? (
              <SchedulePlanReportPanel
                filterProps={{
                  anchorEnd: operationalAnchorEnd,
                  anchorStart: operationalAnchorStart,
                  endDate: operationalEndDate,
                  ownerFilter: operationalOwnerFilter,
                  ownerOptions,
                  onAnchorEndChange: setOperationalAnchorEnd,
                  onAnchorStartChange: setOperationalAnchorStart,
                  onEndDateChange: setOperationalEndDate,
                  onOwnerFilterChange: setOperationalOwnerFilter,
                  onPeriodTypeChange: handleOperationalPeriodTypeChange,
                  onStartDateChange: setOperationalStartDate,
                  periodType: operationalPeriodType,
                  startDate: operationalStartDate
                }}
                ownerFilter={operationalOwner}
                periodRange={periodRange}
                pmJobs={data.pmJobs}
                siteCatalog={data.siteCatalog}
              />
            ) : null}

            {reportSection === "site" ? (
              <SiteInventoryReportPanel
                filterProps={{
                  anchorEnd: operationalAnchorEnd,
                  anchorStart: operationalAnchorStart,
                  endDate: operationalEndDate,
                  ownerFilter: operationalOwnerFilter,
                  ownerOptions,
                  onAnchorEndChange: setOperationalAnchorEnd,
                  onAnchorStartChange: setOperationalAnchorStart,
                  onEndDateChange: setOperationalEndDate,
                  onOwnerFilterChange: setOperationalOwnerFilter,
                  onPeriodTypeChange: handleOperationalPeriodTypeChange,
                  onStartDateChange: setOperationalStartDate,
                  periodType: operationalPeriodType,
                  startDate: operationalStartDate
                }}
                ownerFilter={operationalOwner}
                periodRange={periodRange}
                pmJobs={data.pmJobs}
                siteCatalog={data.siteCatalog}
              />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

function ReportsPageFallback() {
  const { t } = useUi();

  return (
    <AppShell loading>
      <PageTitle title={t("nav.reports")} subtitle={t("reports.reportList")} />
    </AppShell>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsPageFallback />}>
      <ReportsPageInner />
    </Suspense>
  );
}