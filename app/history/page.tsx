"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  MapPin,
  Pencil,
  UserRound,
  Wrench
} from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { AppSelect } from "@/components/AppSelect";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FeedbackPopups } from "@/components/AppPopup";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useUi } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import {
  getContractVisitTotal,
  getUniquePmJobs,
  getWorkSiteByJobId,
  normalizeOwnerName,
  type PmJobRecord,
  type ReportRow,
  type SavedChecklistGroup,
  type SiteRecord
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";
import { usePageShellLoading } from "@/lib/use-page-shell-loading";

const checklistTabs = ["SYNAPSE", "Server", "Switch", "Storage", "Environment", "DIAG"] as const;
const allOwnersValue = "__all";

export default function HistoryPage() {
  const { lang, t } = useUi();
  const { data, error, isLoading } = usePmData();
  const { error: userError, isLoading: userLoading, userName } = useCurrentUser();
  const pageLoading = usePageShellLoading(isLoading, userLoading);
  const reportRows = data.reportRows;
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const activeOwnerFilter = ownerFilter || userName || allOwnersValue;
  const ownerOptions = useMemo(() => {
    const owners = [userName, ...data.owners, ...reportRows.flatMap((row) => row.inspector.split(", "))];
    const seenOwners = new Set<string>();

    return owners
      .map((owner) => owner.trim())
      .filter((owner) => {
        const normalizedOwner = normalizeOwnerName(owner);

        if (!normalizedOwner || seenOwners.has(normalizedOwner)) {
          return false;
        }

        seenOwners.add(normalizedOwner);
        return true;
      });
  }, [data.owners, reportRows, userName]);
  const activeSite = activeReport
    ? data.sites.find((site) => site.id === activeReport.siteId && site.visitDate === toInputDate(activeReport.date))
      ?? getWorkSiteByJobId(data.sites, activeReport.jobId)
    : null;

  const filteredRows = reportRows.filter((row) => {
    const searchableText = `${row.site} ${row.customer} ${row.inspector} ${row.province}`.toLowerCase();
    const rowDate = toInputDate(row.date);
    const matchesQuery = query.trim() ? searchableText.includes(query.trim().toLowerCase()) : true;
    const matchesResult = resultFilter ? row.result === resultFilter : true;
    const matchesOwner = activeOwnerFilter === allOwnersValue
      ? true
      : row.inspector.split(", ").some((owner) => normalizeOwnerName(owner) === normalizeOwnerName(activeOwnerFilter));
    const matchesStart = startDate ? rowDate >= startDate : true;
    const matchesEnd = endDate ? rowDate <= endDate : true;

    return matchesQuery && matchesResult && matchesOwner && matchesStart && matchesEnd;
  });

  return (
    <AppShell loading={pageLoading}>
      {activeReport && activeSite ? (
        <div className="pmWorkPage">
          <HistoryDetailView
            pmJobs={data.pmJobs}
            report={activeReport}
            site={activeSite}
            onBack={() => setActiveReport(null)}
          />
        </div>
      ) : (
        <div className="historyPage">
          <FeedbackPopups alertMessage={error ?? userError} />
          <PageTitle title={t("history.title")} subtitle={t("history.subtitle")} />
          <section className="toolbar">
            <div className="historyFilterField">
              <span>{t("common.search")}</span>
              <SearchControl placeholder={`${t("common.search")}...`} value={query} onChange={setQuery} />
            </div>
            <label className="historyFilterField">
              <span>{t("common.result")}</span>
              <AppSelect className="select" value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
              <option value="">{t("common.all")}</option>
              <option value="ปกติ">{t("common.normal")}</option>
              <option value="ผิดปกติ">{t("common.abnormal")}</option>
              </AppSelect>
            </label>
            <label className="historyFilterField">
              <span>{t("common.inspector")}</span>
              <AppSelect className="select" firstNameOnly value={activeOwnerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value={allOwnersValue}>{t("common.all")}</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
              </AppSelect>
            </label>
            <label className="historyFilterField historyDateRangeField">
              <span>{t("common.dateRange")}</span>
              <DateRangePicker
                endDate={endDate}
                startDate={startDate}
                onEndDateChange={setEndDate}
                onStartDateChange={setStartDate}
              />
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
  pmJobs,
  report,
  site,
  onBack
}: {
  pmJobs: PmJobRecord[];
  report: ReportRow;
  site: SiteRecord;
  onBack: () => void;
}) {
  const { lang, t } = useUi();
  const [activeTab, setActiveTab] = useState<(typeof checklistTabs)[number]>("SYNAPSE");
  const statusClass = report.result === "ผิดปกติ" ? "danger" : "success";
  const visitTotal = getContractVisitTotal(site.contractDetails, site.pmCycle);
  const visitRound = getVisitRound(pmJobs, site, report.jobId);
  const contractStartDate = site.contractDetails?.contractStartDate ?? (site.contractDetails?.contractStartMonth ? `${site.contractDetails.contractStartMonth}-01` : "");
  const contractEndDate = site.contractDetails?.contractEndDate ?? (site.contractDetails?.contractEndMonth ? `${site.contractDetails.contractEndMonth}-01` : "");
  const finishDate = report.workDetails?.savedAt ? report.workDetails.savedAt.slice(0, 10) : toInputDate(report.date);

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
          <Info label={t("history.visitRound")} value={`${visitRound}/${visitTotal || "-"}`} />
          <Info label={t("fields.contractStartDate")} value={formatInputDate(contractStartDate)} />
          <Info label={t("fields.contractEndDate")} value={formatInputDate(contractEndDate)} />
        </div>
      </section>

      <section className="card">
        <h2><Clock3 size={17} /> {t("pm.workTime")}</h2>
        <div className="formGrid">
          <label className="label">
            {t("history.startDate")}
            <input className="field" type="date" readOnly defaultValue={site.visitDate} />
          </label>
          <label className="label">
            {t("history.finishDate")}
            <input className="field" type="date" readOnly defaultValue={finishDate} />
          </label>
          <label className="label">
            {t("fields.startTime")}
            <input className="field" type="time" readOnly defaultValue={site.startTime ?? site.visitTime} />
          </label>
          <label className="label">
            {t("fields.endTime")}
            <input className="field" type="time" readOnly defaultValue={site.endTime ?? ""} />
          </label>
          <label className="label">
            {t("common.inspector")}
            <input className="field" readOnly defaultValue={report.inspector} />
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
        <Link className="button primary" href={`/pm-work?jobId=${encodeURIComponent(report.jobId)}`}>
          <Pencil size={16} />
          {t("history.editData")}
        </Link>
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
  const { lang } = useUi();
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

function getVisitRound(pmJobs: PmJobRecord[], site: SiteRecord, jobId: string) {
  const uniqueJobs = getUniquePmJobs(pmJobs.filter((job) => job.siteId === site.id))
    .sort((first, second) => (
      first.visitDate.localeCompare(second.visitDate) ||
      first.visitTime.localeCompare(second.visitTime)
    ));
  const jobIndex = uniqueJobs.findIndex((job) => job.id === jobId);

  if (jobIndex >= 0) {
    return jobIndex + 1;
  }

  return uniqueJobs.findIndex((job) => job.visitDate === site.visitDate && job.visitTime === site.visitTime) + 1 || 1;
}

function formatInputDate(date: string) {
  if (!date) {
    return "-";
  }

  const [year, month, day] = date.split("-");
  return day && month && year ? `${day}/${month}/${year}` : date;
}

function toInputDate(date: string) {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}
