"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  MapPin,
  Navigation,
  Save,
  UserRound,
  Wrench
} from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { useUi } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import { getWorkSiteByJobId, type ReportRow, type SavedChecklistGroup, type SiteRecord } from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

const checklistTabs = ["SYNAPSE", "Server", "Switch", "Storage", "Environment", "DIAG"] as const;

export default function HistoryPage() {
  const { lang, t } = useUi();
  const { data, error, isLoading } = usePmData();
  const reportRows = data.reportRows;
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const activeSite = activeReport
    ? data.sites.find((site) => site.id === activeReport.siteId && site.visitDate === toInputDate(activeReport.date))
      ?? getWorkSiteByJobId(data.sites, activeReport.jobId)
    : null;

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
      {activeReport && activeSite ? (
        <div className="pmWorkPage">
          <HistoryDetailView
            report={activeReport}
            site={activeSite}
            onBack={() => setActiveReport(null)}
          />
        </div>
      ) : (
        <div className="historyPage">
          <FeedbackPopups loading={isLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error} />
          <PageTitle title={t("history.title")} subtitle={t("history.subtitle")} />
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
              <button
                className="row"
                key={row.id}
                type="button"
                onClick={() => setActiveReport(row)}
              >
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
                <ChevronRight size={18} />
              </button>
            )) : <EmptyState message={t("history.empty")} />}
          </section>
        </div>
      )}
    </AppShell>
  );
}

function HistoryDetailView({
  report,
  site,
  onBack
}: {
  report: ReportRow;
  site: SiteRecord;
  onBack: () => void;
}) {
  const { lang, t } = useUi();
  const [activeTab, setActiveTab] = useState<(typeof checklistTabs)[number]>("SYNAPSE");
  const statusClass = report.result === "ผิดปกติ" ? "danger" : "success";

  return (
    <div className="detailPage">
      <div className="detailTitle">
        <button className="backButton" type="button" onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{site.site}</h1>
          <p>{site.customer} · {toInputDate(report.date)}</p>
        </div>
        <span className={`statusPill ${statusClass}`}>{localizeLabel(report.result, lang)}</span>
      </div>

      <section className="card">
        <h2><Wrench size={17} /> {t("pm.siteInfo")}</h2>
        <div className="infoGrid">
          <Info label={t("common.customer")} value={site.customer} />
          <Info label={t("pm.phoneShort")} value={site.phone} />
          <Info label={t("common.province")} value={site.province} />
          <Info label={t("pm.region")} value={site.region} />
          <Info label={t("common.owner")} value={report.inspector} />
          <Info label={t("pm.pmCycle")} value={localizeLabel(site.pmCycle, lang)} />
        </div>
        <button
          className="button subtle"
          type="button"
          onClick={() => {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`, "_blank", "noopener,noreferrer");
          }}
        >
          <Navigation size={16} />
          {t("pm.navigateGoogleMaps")}
        </button>
      </section>

      <section className="card">
        <h2><Clock3 size={17} /> {t("pm.workTime")}</h2>
        <div className="formGrid">
          <label className="label">
            {t("fields.startTime")}
            <input className="field" type="time" defaultValue={site.startTime ?? site.visitTime} />
          </label>
          <label className="label">
            {t("fields.endTime")}
            <input className="field" type="time" defaultValue={site.endTime ?? ""} />
          </label>
          <label className="label">
            {t("common.inspector")}
            <input className="field" defaultValue={report.inspector} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2><ClipboardCheck size={17} /> {t("pm.checklist")}</h2>
        <div className="tabs">
          {checklistTabs.map((tab) => (
            <button
              className={tab === activeTab ? "activeTab" : "tab"}
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="templateList">
          <section className="templateSet">
            <h3 className="checkSectionTitle">{activeTab}</h3>
            <HistoryChecklistDetails activeTab={activeTab} report={report} />
          </section>
        </div>
      </section>

      <div className="stickyActions">
        <button className="button ghost" type="button" onClick={onBack}>{t("common.back")}</button>
        <button className="button subtle" type="button" onClick={onBack}>{t("common.saveDraft")}</button>
        <button className="button primary" type="button" onClick={onBack}>
          <Save size={16} />
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

function HistoryChecklistDetails({
  activeTab,
  report
}: {
  activeTab: (typeof checklistTabs)[number];
  report: ReportRow;
}) {
  const { lang, t } = useUi();
  const groupKey = toChecklistGroupKey(activeTab);
  const group = report.workDetails?.checklistSnapshot?.find((item) => item.key === groupKey);

  if (!group) {
    return <p className="emptyChecklist">{t("reports.resultPrefix")}: {localizeLabel(report.result, lang)}</p>;
  }

  return (
    <div className="historyChecklistDetail">
      {group.sets.map((set) => (
        <section className="templateSet" key={set.title}>
          <h3 className="checkSectionTitle">{set.title}</h3>
          {set.blocks.map((block, blockIndex) => (
            <HistoryChecklistBlock
              key={`${set.title}-${blockIndex}`}
              block={block}
              blockIndex={blockIndex}
              group={group}
              report={report}
              setTitle={set.title}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function HistoryChecklistBlock({
  block,
  blockIndex,
  group,
  report,
  setTitle
}: {
  block: SavedChecklistGroup["sets"][number]["blocks"][number];
  blockIndex: number;
  group: SavedChecklistGroup;
  report: ReportRow;
  setTitle: string;
}) {
  const { lang, t } = useUi();
  const details = report.workDetails;
  const resultPrefix = `${group.key}:${setTitle}:${blockIndex}`;

  if (block.type === "fields") {
    return (
      <section className="templateBlock">
        <h4>{localizeLabel(block.title, lang)}</h4>
        <div className="savedDetailGrid">
          {block.fields.map((field) => {
            const key = historyFieldKey(group.key, setTitle, blockIndex, field.label);
            const value = details?.fieldValues?.[key] ?? field.value ?? "-";

            return <Info key={key} label={localizeLabel(field.label, lang)} value={value || "-"} />;
          })}
        </div>
      </section>
    );
  }

  if (block.type === "radios") {
    const key = historyRadioKey(group.key, setTitle, blockIndex, block.label);
    const value = details?.radioValues?.[key] ?? block.items[0] ?? "-";

    return (
      <section className="templateBlock">
        <Info label={localizeLabel(block.label, lang)} value={localizeLabel(value, lang)} />
      </section>
    );
  }

  if (block.type === "diagTable") {
    const rows = ["Monitor", "Mouse", "Keyboard", "PC", "UPS"].flatMap((device) => (
      ["Cleaning", "Availability", "Abnormal", "Repaired"].map((column) => {
        const key = `${resultPrefix}:${device}:${column}`;
        return {
          key,
          label: `${device} ${column}`,
          result: details?.checkResults?.[key],
          note: details?.checkNotes?.[key]
        };
      })
    ));

    return (
      <section className="templateBlock">
        <h4>{localizeLabel(block.title, lang)}</h4>
        <div className="savedChecklistRows">
          {rows.map((row) => (
            <SavedChecklistRow
              key={row.key}
              label={row.label}
              note={row.note}
              result={row.result}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="templateBlock">
      <h4>{localizeLabel(block.title, lang)}</h4>
      <div className="savedChecklistRows">
        {block.items.map((item) => {
          const key = `${resultPrefix}:${block.title}:${item}`;
          return (
            <SavedChecklistRow
              key={key}
              label={localizeLabel(item, lang)}
              note={details?.checkNotes?.[key]}
              result={details?.checkResults?.[key]}
            />
          );
        })}
      </div>
    </section>
  );
}

function SavedChecklistRow({
  label,
  note,
  result
}: {
  label: string;
  note?: string;
  result?: "ok" | "bad";
}) {
  const { t } = useUi();
  const resultLabel = result === "ok"
    ? t("pm.pass")
    : result === "bad" ? t("pm.fail") : "-";

  return (
    <div className="savedChecklistRow">
      <strong>{label}</strong>
      <span className={result === "bad" ? "statusPill danger" : result === "ok" ? "statusPill success" : "statusPill warning"}>
        {resultLabel}
      </span>
      {note ? <p>{t("common.note")}: {note}</p> : null}
    </div>
  );
}

function toChecklistGroupKey(tab: (typeof checklistTabs)[number]) {
  return tab.toLowerCase();
}

function historyFieldKey(groupKey: string, setTitle: string, blockIndex: number, label: string) {
  return `${groupKey}:field:${setTitle}:${blockIndex}:${label}`;
}

function historyRadioKey(groupKey: string, setTitle: string, blockIndex: number, label: string) {
  return `${groupKey}:radio:${setTitle}:${blockIndex}:${label}`;
}

function toInputDate(date: string) {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}
