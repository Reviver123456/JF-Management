"use client";

import { useState } from "react";
import { CalendarDays, Eye, MapPin, Printer, UserRound, X } from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { useUi } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import type { ReportRow } from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

export default function ReportsPage() {
  const { lang, t } = useUi();
  const { data, error, isLoading } = usePmData();
  const reportRows = data.reportRows;
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredRows = reportRows.filter((row) => {
    const searchableText = `${row.site} ${row.customer} ${row.inspector} ${row.province}`.toLowerCase();
    const rowDate = toInputDate(row.date);
    const matchesQuery = query.trim() ? searchableText.includes(query.trim().toLowerCase()) : true;
    const matchesResult = resultFilter ? row.result === resultFilter : true;
    const matchesStart = startDate ? rowDate >= startDate : true;
    const matchesEnd = endDate ? rowDate <= endDate : true;

    return matchesQuery && matchesResult && matchesStart && matchesEnd;
  });

  return (
    <AppShell>
      <div className="reportsPage">
      <FeedbackPopups loading={isLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error} />
      <PageTitle title={t("reports.title")} subtitle={t("reports.subtitle")} />
      <section className="toolbar">
        <SearchControl placeholder={`${t("common.search")}...`} value={query} onChange={setQuery} />
        <select className="select" value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
          <option value="">{t("common.all")}</option>
          <option value="ปกติ">{t("common.normal")}</option>
          <option value="ผิดปกติ">{t("common.abnormal")}</option>
        </select>
        <label className="dateField">
          {t("common.datePlaceholder")}
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="dateField">
          {t("common.datePlaceholder")}
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </section>

      <section className="rows">
        {filteredRows.length > 0 ? filteredRows.map((row) => (
          <article className="row" key={row.id}>
            <div>
              <strong>{row.site}</strong>
            </div>
            <small>
              <UserRound size={13} /> {row.customer}
              <CalendarDays size={13} /> {row.date}
              <span>{t("common.inspectorPrefix")}: {row.inspector}</span>
              <MapPin size={13} /> {row.province}
            </small>
            <button className="viewButton" type="button" onClick={() => setActiveReport(row)}>
              <Eye size={15} />
              {t("common.view")}
            </button>
          </article>
        )) : <EmptyState message={t("reports.empty")} />}
      </section>

      {activeReport ? <ReportModal row={activeReport} onClose={() => setActiveReport(null)} lang={lang} /> : null}
      </div>
    </AppShell>
  );
}

function ReportModal({ row, onClose, lang }: { row: ReportRow; onClose: () => void; lang: "th" | "en" }) {
  const { t } = useUi();

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("reports.modalTitle")}>
      <article className="modal">
        <div className="modalHeader">
          <h2>{t("reports.modalTitle")} - {row.site}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}><X size={18} /></button>
        </div>
        <section className="modalSection">
          <h3>{t("reports.siteInfo")}</h3>
          <div className="modalGrid">
            <Info label={t("common.customer")} value={row.customer} />
            <Info label={t("common.province")} value={row.province} />
            <Info label={t("fields.date")} value={row.date} />
            <Info label={t("common.inspector")} value={row.inspector} />
            <Info label={t("reports.startTime")} value={row.startTime || "-"} />
            <Info label={t("reports.endTime")} value={row.endTime || "-"} />
          </div>
        </section>
        <section className="modalSection">
          <h3>{t("reports.summary")}</h3>
          <p>{t("reports.resultPrefix")}: <strong>{localizeLabel(row.result, lang)}</strong></p>
        </section>
        <div className="modalActions">
          <button className="button subtle" type="button" onClick={() => window.print()}>
            <Printer size={16} />
            {t("common.print")}
          </button>
        </div>
      </article>
    </div>
  );
}

function toInputDate(date: string) {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}
