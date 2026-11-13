"use client";

import { useMemo, useRef, type RefObject } from "react";
import { MapPin, UserRound } from "lucide-react";
import { useUi } from "@/lib/i18n";
import { normalizeOwnerName, type PmJobRecord, type SiteCatalogRecord } from "@/lib/pm-data";
import {
  formatOperationalDisplayDate,
  formatSiteVisitTotal,
  getSiteOwnerSummarySets,
  getSiteReportRows
} from "@/lib/operational-report-data";
import { formatOperationalReportDate } from "@/lib/operational-report-document";
import { isAllOwners } from "@/lib/owner-filter";
import type { ReportPeriodRange } from "@/lib/report-period";
import { ReportListPagination } from "@/components/reports/ReportListPagination";
import { useReportListPagination } from "@/lib/use-report-list-pagination";
import { OperationalReportBrandHeader } from "@/components/reports/OperationalReportBrandHeader";
import {
  OperationalReportDocumentBody,
  OperationalReportDocumentFooter,
  OperationalReportDocumentTable,
  OperationalReportSectionHead
} from "@/components/reports/OperationalReportDocumentUI";
import { OperationalReportOwnerSummary } from "@/components/reports/OperationalReportOwnerSummary";
import { OperationalReportPreviewLayout } from "@/components/reports/OperationalReportPreviewLayout";
import type { OperationalReportFilterProps } from "@/components/reports/OperationalReportFilters";

function SiteRowsTable({
  listTopRef,
  rows,
  totalCount,
  variant
}: {
  listTopRef?: RefObject<HTMLDivElement | null>;
  rows: ReturnType<typeof getSiteReportRows>;
  totalCount?: number;
  variant: "document" | "list";
}) {
  const { t } = useUi();
  const isDocument = variant === "document";

  const tableHead = (
    <tr>
      {isDocument ? <th className="operationalDocNumCol">#</th> : null}
      <th>{t("reports.siteName")}</th>
      <th>{t("reports.province")}</th>
      <th>{t("fields.customerName")}</th>
      <th>{t("common.owner")}</th>
      <th>{t("fields.contractNumber")}</th>
      <th>{t("reports.siteContractStart")}</th>
      <th>{t("reports.siteContractEnd")}</th>
      <th>{t("reports.pmCycle")}</th>
    </tr>
  );

  const tableRows = rows.map((row, index) => (
    <tr key={`${row.site.id}-${row.contractIndex}`}>
      {isDocument ? <td className="operationalDocNumCol">{index + 1}</td> : null}
      <td className={isDocument ? "operationalDocStrong" : undefined}>{row.site.site}</td>
      <td>
        {!isDocument ? <MapPin size={13} /> : null}
        {row.site.province || "-"}
      </td>
      <td>{row.site.customer || "-"}</td>
      <td>
        {!isDocument ? <UserRound size={13} /> : null}
        {normalizeOwnerName(row.site.owner) || "-"}
      </td>
      <td>{row.contractNumber}</td>
      <td>{formatOperationalDisplayDate(row.contractStartDate)}</td>
      <td>{formatOperationalDisplayDate(row.contractEndDate)}</td>
      <td className={isDocument ? "operationalDocMetric" : undefined}>{formatSiteVisitTotal(row.visitTotal)}</td>
    </tr>
  ));

  if (isDocument) {
    return (
      <>
        <OperationalReportSectionHead title={t("reports.siteTableTitle")} />
        <OperationalReportDocumentTable emptyMessage={rows.length === 0 ? t("reports.siteEmpty") : undefined}>
          {rows.length > 0 ? (
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
        <h2>{t("reports.siteTableTitle")}</h2>
        <span>{totalCount ?? rows.length}</span>
      </div>

      {rows.length > 0 ? (
        <div className="reportDataTableWrap">
          <table className="reportDataTable">
            <thead>{tableHead}</thead>
            <tbody>{tableRows}</tbody>
          </table>
        </div>
      ) : (
        <p className="reportEmptyState">{t("reports.siteEmpty")}</p>
      )}
    </section>
  );
}

export function SiteInventoryReportPanel({
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

  const rows = useMemo(() => getSiteReportRows({
    ownerFilter,
    periodRange,
    pmJobs,
    siteCatalog
  }), [ownerFilter, periodRange, pmJobs, siteCatalog]);

  const listTopRef = useRef<HTMLDivElement>(null);
  const ownerSummarySets = useMemo(
    () => getSiteOwnerSummarySets(rows, pmJobs, periodRange),
    [periodRange, pmJobs, rows]
  );
  const listPagination = useReportListPagination(rows);

  const ownerLabel = isAllOwners(ownerFilter) ? t("common.all") : ownerFilter;
  const headerSubtitle = `${periodRange?.label ?? "-"} · ${t("common.owner")}: ${ownerLabel}`;
  const exportFileTitle = `${t("reports.sections.site")}-${periodRange?.label ?? "report"}`;
  const generatedAt = formatOperationalReportDate(lang);

  const documentNode = (
    <>
      <OperationalReportBrandHeader periodLabel={periodRange?.label ?? "-"} reportKind="site" />
      <OperationalReportDocumentBody>
        <OperationalReportOwnerSummary sets={ownerSummarySets} />
        <SiteRowsTable rows={rows} variant="document" />
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
      <SiteRowsTable
        listTopRef={listTopRef}
        rows={listPagination.items}
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
      headerTitle={t("reports.sections.site")}
      listNode={listNode}
    />
  );
}
