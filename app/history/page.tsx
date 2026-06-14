"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
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
import { TimePicker } from "@/components/TimePicker";
import { FeedbackPopups } from "@/components/AppPopup";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useUi } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import {
  getContractCount,
  getUniquePmJobs,
  getWorkSiteByJobId,
  getSiteContractAt,
  getSiteContractItems,
  getSiteContractLabel,
  getSiteContractVisitTotal,
  mergeWorkDetailsForContract,
  normalizeOwnerName,
  type PmJobRecord,
  type PmWorkDetails,
  type ReportRow,
  type SavedChecklistGroup,
  type SiteRecord
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";
import { useOwnerFromUrl } from "@/lib/hooks/use-owner-from-url";
import {
  ALL_OWNERS_VALUE,
  buildUniqueOwnerOptions,
  isAllOwners,
  resolveActiveOwner
} from "@/lib/owner-filter";
import type { PmChecklistKey } from "@/lib/pm-checklist-config";
import { checklistTabs as checklistTabDefs } from "@/lib/pm-checklist-data";
import { mergePhotoState, type PhotoCategory } from "@/lib/pm-photos";

const photoUploadItems: { key: PhotoCategory; labelKey: "pm.devicePhoto" | "pm.overviewPhoto" | "pm.issuePhoto" | "pm.partPhoto" }[] = [
  { key: "device", labelKey: "pm.devicePhoto" },
  { key: "overview", labelKey: "pm.overviewPhoto" },
  { key: "issue", labelKey: "pm.issuePhoto" },
  { key: "part", labelKey: "pm.partPhoto" }
];

export default function HistoryPage() {
  const { lang, t } = useUi();
  const { data, error } = usePmData();
  const { error: userError, userName } = useCurrentUser();
  const ownerParam = useOwnerFromUrl();
  const reportRows = data.reportRows;
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeReport, setActiveReport] = useState<ReportRow | null>(null);
  const activeOwnerFilter = resolveActiveOwner({ selectedOwner: ownerFilter, ownerParam, userName });
  const ownerOptions = useMemo(
    () => buildUniqueOwnerOptions(
      [userName],
      data.owners,
      reportRows.flatMap((row) => row.inspector.split(", "))
    ),
    [data.owners, reportRows, userName]
  );
  const activeSite = activeReport
    ? data.sites.find((site) => site.id === activeReport.siteId && site.visitDate === toInputDate(activeReport.date))
      ?? getWorkSiteByJobId(data.sites, activeReport.jobId)
    : null;

  const filteredRows = reportRows.filter((row) => {
    const searchableText = `${row.site} ${row.customer} ${row.inspector} ${row.province}`.toLowerCase();
    const rowDate = toInputDate(row.date);
    const matchesQuery = query.trim() ? searchableText.includes(query.trim().toLowerCase()) : true;
    const matchesResult = resultFilter ? row.result === resultFilter : true;
    const matchesOwner = isAllOwners(activeOwnerFilter)
      ? true
      : row.inspector.split(", ").some((owner) => normalizeOwnerName(owner) === normalizeOwnerName(activeOwnerFilter));
    const matchesStart = startDate ? rowDate >= startDate : true;
    const matchesEnd = endDate ? rowDate <= endDate : true;

    return matchesQuery && matchesResult && matchesOwner && matchesStart && matchesEnd;
  });

  return (
    <AppShell>
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
              <option value={ALL_OWNERS_VALUE}>{t("common.all")}</option>
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
  const contractCount = getContractCount(site.contractDetails);
  const contractItems = useMemo(() => getSiteContractItems(site), [site]);
  const [selectedContractIndex, setSelectedContractIndex] = useState(() => {
    const savedIndex = report.workDetails?.contractIndex ?? 0;
    return Math.min(Math.max(savedIndex, 0), Math.max(contractCount - 1, 0));
  });
  const selectedContract = getSiteContractAt(site, selectedContractIndex);
  const contractWorkDetails = useMemo(
    () => mergeWorkDetailsForContract(report.workDetails, selectedContractIndex),
    [report.workDetails, selectedContractIndex]
  );
  const [activeTab, setActiveTab] = useState<PmChecklistKey>("synapse");
  const availableTabs = useMemo(() => {
    const snapshot = contractWorkDetails?.checklistSnapshot ?? [];
    const keys = new Set(snapshot.map((item) => item.key));
    return checklistTabDefs.filter((tab) => keys.has(tab.key));
  }, [contractWorkDetails?.checklistSnapshot]);
  const activeTabTitle = availableTabs.find((tab) => tab.key === activeTab)?.title ?? activeTab;
  const statusClass = report.result === "ผิดปกติ" ? "danger" : "success";

  useEffect(() => {
    if (availableTabs.length === 0) {
      return;
    }

    if (!availableTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [activeTab, availableTabs]);
  const visitTotal = getSiteContractVisitTotal(site, selectedContractIndex, site.pmCycle);
  const visitRound = getVisitRound(pmJobs, site, report.jobId);
  const displayPmCycle = selectedContract.pmCycle ?? site.pmCycle;
  const contractStartDate = selectedContract.contractStartDate ?? "";
  const contractEndDate = selectedContract.contractEndDate ?? "";
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
        <label className="label contractSelectField">
          {t("pm.selectContract")}
          <AppSelect
            className="select"
            value={String(selectedContractIndex)}
            onChange={(event) => setSelectedContractIndex(Number(event.target.value))}
          >
            {contractItems.map((contract, index) => (
              <option key={index} value={index}>{getSiteContractLabel(contract, index)}</option>
            ))}
          </AppSelect>
        </label>
        <div className="infoGrid">
          <Info label={t("common.customer")} value={site.customer} />
          <Info label={t("pm.phoneShort")} value={site.phone} />
          <Info label={t("common.province")} value={site.province} />
          <Info label={t("pm.region")} value={site.region} />
          <Info label={t("common.owner")} value={report.inspector} />
          <Info label={t("pm.pmCycle")} value={localizeLabel(displayPmCycle, lang)} />
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
          <div className="label">
            {t("fields.startTime")}
            <TimePicker readOnly value={site.startTime ?? site.visitTime ?? ""} />
          </div>
          <div className="label">
            {t("fields.endTime")}
            <TimePicker readOnly value={site.endTime ?? ""} />
          </div>
          <label className="label">
            {t("common.inspector")}
            <input className="field" readOnly defaultValue={report.inspector} />
          </label>
        </div>
      </section>

      {availableTabs.length > 0 ? (
        <section className="card">
          <h2><ClipboardCheck size={17} /> {t("pm.checklist")}</h2>
          <div className="tabs historyTabs">
            {availableTabs.map((tab) => (
              <button
                className={tab.key === activeTab ? "activeTab" : "tab"}
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.title}
              </button>
            ))}
          </div>
          <div className="templateList">
            <section className="templateSet">
              <h3 className="checkSectionTitle">{activeTabTitle}</h3>
              <HistoryChecklistDetails activeTab={activeTab} workDetails={contractWorkDetails} report={report} />
            </section>
          </div>
        </section>
      ) : null}

      <HistoryPhotosSection report={report} />

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

function HistoryPhotosSection({ report }: { report: ReportRow }) {
  const { t } = useUi();
  const [showPhotos, setShowPhotos] = useState(false);
  const photos = mergePhotoState(report.workDetails?.photos);
  const photoNotes = report.workDetails?.photoNotes ?? {};
  const categoriesWithContent = photoUploadItems.filter(
    (item) => photos[item.key].length > 0 || Boolean(photoNotes[item.key]?.trim())
  );
  const [activePhotoCategory, setActivePhotoCategory] = useState<PhotoCategory>(
    categoriesWithContent[0]?.key ?? "device"
  );
  const totalPhotoCount = photoUploadItems.reduce((sum, item) => sum + photos[item.key].length, 0);
  const activePhotoItem = categoriesWithContent.find((item) => item.key === activePhotoCategory)
    ?? categoriesWithContent[0];

  useEffect(() => {
    if (categoriesWithContent.length === 0) {
      return;
    }

    if (!categoriesWithContent.some((item) => item.key === activePhotoCategory)) {
      setActivePhotoCategory(categoriesWithContent[0].key);
    }
  }, [activePhotoCategory, categoriesWithContent]);

  if (categoriesWithContent.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <div className="historyPhotoHeader">
        <h2><Camera size={17} /> {t("pm.photos")}</h2>
        <button
          className="button subtle"
          type="button"
          onClick={() => setShowPhotos((current) => !current)}
        >
          <Camera size={16} />
          {showPhotos ? t("history.hidePhotos") : t("history.showPhotos")}
          {totalPhotoCount > 0 ? ` (${totalPhotoCount})` : ""}
        </button>
      </div>

      {showPhotos ? (
        <>
          <div className="tabs historyTabs historyPhotoTabs">
            {categoriesWithContent.map((item) => (
              <button
                className={item.key === activePhotoCategory ? "activeTab" : "tab"}
                key={item.key}
                type="button"
                onClick={() => setActivePhotoCategory(item.key)}
              >
                {t(item.labelKey)}
                {photos[item.key].length > 0 ? ` (${photos[item.key].length})` : ""}
              </button>
            ))}
          </div>

          {activePhotoItem ? (
            <div className="historyPhotoGroups">
              <div className="historyPhotoGroup">
                {photoNotes[activePhotoItem.key]?.trim() ? (
                  <p className="historyPhotoNote">{photoNotes[activePhotoItem.key]}</p>
                ) : null}
                {photos[activePhotoItem.key].length > 0 ? (
                  <div className="photoThumbGrid">
                    {photos[activePhotoItem.key].map((photo) => (
                      <figure className="photoThumbCard historyPhotoThumb" key={photo.id}>
                        <img alt={photo.name} src={photo.dataUrl} />
                        <figcaption>{photo.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="emptyChecklist">{t("history.noPhotos")}</p>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function HistoryChecklistDetails({
  activeTab,
  report,
  workDetails
}: {
  activeTab: PmChecklistKey;
  report: ReportRow;
  workDetails?: PmWorkDetails;
}) {
  const { lang, t } = useUi();
  const group = workDetails?.checklistSnapshot?.find((item) => item.key === activeTab);

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
              workDetails={workDetails}
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
  setTitle,
  workDetails
}: {
  block: SavedChecklistGroup["sets"][number]["blocks"][number];
  blockIndex: number;
  group: SavedChecklistGroup;
  report: ReportRow;
  setTitle: string;
  workDetails?: PmWorkDetails;
}) {
  const { lang } = useUi();
  const details = workDetails;
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
