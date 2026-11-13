"use client";

import { useMemo, useRef, type RefObject } from "react";
import { CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
import { useUi } from "@/lib/i18n";
import {
  formatVisitTime,
  normalizeOwnerName,
  type PmJobRecord,
  type SiteCatalogRecord
} from "@/lib/pm-data";
import {
  formatPlanJobVisitDate,
  getPlanJobStatusLabelKey,
  getPlanJobDisplayStatus,
  getPlanJobVisitRoundText,
  getPlanOwnerSummarySets,
  getPlanReportJobs
} from "@/lib/operational-report-data";
import { formatOperationalReportDate } from "@/lib/operational-report-document";
import { isAllOwners } from "@/lib/owner-filter";
import type { ReportPeriodRange } from "@/lib/report-period";
import { ReportListPagination } from "@/components/reports/ReportListPagination";
import { useReportListPagination } from "@/lib/use-report-list-pagination";
import { OperationalReportBrandHeader } from "@/components/reports/OperationalReportBrandHeader";
import {
  OperationalReportDocStatus,
  OperationalReportDocumentBody,
  OperationalReportDocumentFooter,
  OperationalReportDocumentTable,
  OperationalReportSectionHead
} from "@/components/reports/OperationalReportDocumentUI";
import { OperationalReportOwnerSummary } from "@/components/reports/OperationalReportOwnerSummary";
import { OperationalReportPreviewLayout } from "@/components/reports/OperationalReportPreviewLayout";
import type { OperationalReportFilterProps } from "@/components/reports/OperationalReportFilters";

function PlanJobsTable({
  jobs,
  listTopRef,
  pmJobs,
  siteById,
  totalCount,
  variant
}: {
  jobs: PmJobRecord[];
  listTopRef?: RefObject<HTMLDivElement | null>;
  pmJobs: PmJobRecord[];
  siteById: Map<string, SiteCatalogRecord>;
  totalCount?: number;
  variant: "document" | "list";
}) {
  const { t } = useUi();
  const isDocument = variant === "document";

  const tableHead = (
    <tr>
      {isDocument ? <th className="operationalDocNumCol">#</th> : null}
      <th>{t("fields.date")}</th>
      <th>{t("reports.visitTime")}</th>
      <th>{t("reports.siteName")}</th>
      <th>{t("reports.province")}</th>
      <th>{t("common.owner")}</th>
      <th>{t("reports.pmCycle")}</th>
      <th className="operationalDocStatusCol">{t("common.status")}</th>
    </tr>
  );

  const tableRows = jobs.map((job, index) => {
    const site = siteById.get(job.siteId);
    const displayStatus = getPlanJobDisplayStatus(job.status);
    const statusLabel = t(getPlanJobStatusLabelKey(job.status));
    const visitRoundText = getPlanJobVisitRoundText(pmJobs, job, site);

    return (
      <tr key={job.id}>
        {isDocument ? <td className="operationalDocNumCol">{index + 1}</td> : null}
        <td>
          {!isDocument ? <CalendarDays size={13} /> : null}
          {formatPlanJobVisitDate(job.visitDate)}
        </td>
        <td>
          {!isDocument ? <Clock3 size={13} /> : null}
          {formatVisitTime(job.visitTime)}
        </td>
        <td className={isDocument ? "operationalDocStrong" : undefined}>{site?.site ?? "-"}</td>
        <td>
          {!isDocument ? <MapPin size={13} /> : null}
          {site?.province ?? "-"}
        </td>
        <td>
          {!isDocument ? <UserRound size={13} /> : null}
          {normalizeOwnerName(job.owner) || "-"}
        </td>
        <td>{visitRoundText}</td>
        <td className={isDocument ? "operationalDocStatusCol" : undefined}>
          {isDocument ? (
            <OperationalReportDocStatus label={statusLabel} status={displayStatus} />
          ) : (
            <span className={`statusPill ${displayStatus === "completed" ? "success" : ""}`}>
              {statusLabel}
            </span>
          )}
        </td>
      </tr>
    );
  });

  if (isDocument) {
    return (
      <>
        <OperationalReportSectionHead title={t("reports.planTableTitle")} />
        <OperationalReportDocumentTable emptyMessage={jobs.length === 0 ? t("reports.planEmpty") : undefined}>
          {jobs.length > 0 ? (
            <>
              <thead>{tableHead}</thead>
              <tbody>{tableRows}</tbody>
            </>
          ) : null}
        </OperationalReportDocumentTable>
      </>
    );
  }

  return (
    <section className="reportListPanel reportTablePanel">
      <div ref={listTopRef} className="panelTitleRow">
        <h2>{t("reports.planTableTitle")}</h2>
        <span>{totalCount ?? jobs.length}</span>
      </div>

      {jobs.length > 0 ? (
        <div className="reportDataTableWrap">
          <table className="reportDataTable">
            <thead>{tableHead}</thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>
      ) : (
        <p className="reportEmptyState">{t("reports.planEmpty")}</p>
      )}
    </section>
  );
}

export function SchedulePlanReportPanel({
  filterProps,
  ownerFilter,
  periodRange,
  pmJobs,
  siteCatalog
}: {
  filterProps: OperationalReportFilterProps;
  ownerFilter: string;
  periodRange: ReportPeriodRange | null;
  pmJobs: PmJobRecord[];
  siteCatalog: SiteCatalogRecord[];
}) {
  const { lang, t } = useUi();
  const siteById = useMemo(() => new Map(siteCatalog.map((site) => [site.id, site])), [siteCatalog]);

  const jobs = useMemo(() => getPlanReportJobs({
    ownerFilter,
    periodRange,
    pmJobs,
    siteCatalog
  }), [ownerFilter, periodRange, pmJobs, siteCatalog]);

  const listTopRef = useRef<HTMLDivElement>(null);
  const ownerSummarySets = useMemo(() => getPlanOwnerSummarySets(jobs), [jobs]);
  const listPagination = useReportListPagination(jobs);

  const ownerLabel = isAllOwners(ownerFilter) ? t("common.all") : ownerFilter;
  const headerSubtitle = `${periodRange?.label ?? "-"} · ${t("common.owner")}: ${ownerLabel}`;
  const exportFileTitle = `${t("reports.sections.plan")}-${periodRange?.label ?? "report"}`;
  const generatedAt = formatOperationalReportDate(lang);

  const documentNode = (
    <>
      <OperationalReportBrandHeader periodLabel={periodRange?.label ?? "-"} reportKind="plan" />
      <OperationalReportDocumentBody>
        <OperationalReportOwnerSummary sets={ownerSummarySets} />
        <PlanJobsTable jobs={jobs} pmJobs={pmJobs} siteById={siteById} variant="document" />
        <OperationalReportDocumentFooter
          generatedLabel={t("reports.operationalDocument.generated")}
          generatedValue={generatedAt}
          line={t("reports.operationalDocument.footerLine")}
        />
      </OperationalReportDocumentBody>
    </>
  );

  const listNode = (
    <>
      <PlanJobsTable
        jobs={listPagination.items}
        listTopRef={listTopRef}
        pmJobs={pmJobs}
        siteById={siteById}
        totalCount={listPagination.totalItems}
        variant="list"
      />
      <ReportListPagination
        endIndex={listPagination.endIndex}
        page={listPagination.page}
        scrollTargetRef={listTopRef}
        startIndex={listPagination.startIndex}
        totalItems={listPagination.totalItems}
        totalPages={listPagination.totalPages}
        onPageChange={listPagination.setPage}
      />
    </>
  );

  return (
    <OperationalReportPreviewLayout
      disabled={!periodRange}
      documentNode={documentNode}
      exportFileTitle={exportFileTitle}
      filterProps={filterProps}
      headerSubtitle={headerSubtitle}
      headerTitle={t("reports.sections.plan")}
      listNode={listNode}
    />
  );
}
