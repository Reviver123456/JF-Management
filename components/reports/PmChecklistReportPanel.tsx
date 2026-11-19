"use client";

import { useRef, type RefObject } from "react";
import { CalendarDays, Eye, MapPin, UserRound } from "lucide-react";
import { useUi, type Lang } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import type { ReportRow } from "@/lib/pm-data";
import { ReportListPagination } from "@/components/reports/ReportListPagination";
import { useReportListPagination } from "@/lib/use-report-list-pagination";

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}

export function PmChecklistReportPanel({
  filteredReports,
  lang,
  onPreviewReport
}: {
  filteredReports: ReportRow[];
  lang: Lang;
  onPreviewReport: (row: ReportRow, contractIndex?: number) => void;
}) {
  const { t } = useUi();
  const listTopRef = useRef<HTMLDivElement>(null);
  const listPagination = useReportListPagination(filteredReports);

  return (
    <div className="reportAnalyticsPanel">
      <section className="reportListPanel reportListOnly">
        <div ref={listTopRef} className="panelTitleRow">
          <h2>{t("reports.reportList")}</h2>
          <span>{listPagination.totalItems}</span>
        </div>
        <div className="rows reportRows">
        {listPagination.items.length > 0 ? listPagination.items.map((row) => (
            <article className="row reportListRow" key={row.id}>
              <div className="reportListRowMain">
                <div>
                  <strong>{row.site}</strong>
                  <span className={row.result === "ผิดปกติ" ? "statusPill danger" : "statusPill success"}>{localizeLabel(row.result, lang)}</span>
                </div>
                <small>
                  <UserRound size={13} /> {row.customer}
                  <CalendarDays size={13} /> {row.date}
                  <span>{t("common.inspectorPrefix")}: {row.inspector}</span>
                  <MapPin size={13} /> {row.province}
                </small>
              </div>
              <div className="reportListRowActions">
                <button
                  aria-label={`${t("reports.preview")} ${row.site}`}
                  className="button primary reportListPreviewButton"
                  type="button"
                  onClick={() => onPreviewReport(row)}
                >
                  <Eye size={14} />
                  {t("reports.preview")}
                </button>
              </div>
            </article>
        )) : <EmptyState message={t("reports.empty")} />}
        </div>
      </section>
      <ReportListPagination
        endIndex={listPagination.endIndex}
        page={listPagination.page}
        scrollTargetRef={listTopRef as RefObject<HTMLElement | null>}
        startIndex={listPagination.startIndex}
        totalItems={listPagination.totalItems}
        totalPages={listPagination.totalPages}
        onPageChange={listPagination.setPage}
      />
    </div>
  );
}