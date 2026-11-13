"use client";

import { createElement, Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Barcode,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  Cpu,
  Eye,
  Globe,
  HardDrive,
  Hospital,
  Leaf,
  Mail,
  MapPin,
  Monitor,
  Network,
  Phone,
  Server,
  Stethoscope,
  UserRound,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { AppSelect } from "@/components/AppSelect";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FeedbackPopups } from "@/components/AppPopup";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import { useUi, type Lang } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import { getDisplayPmOrderNo } from "@/lib/pm-order-no";
import {
  getReportExportHtml,
  getReportExportTitle,
  prepareOfficeExportContentSync
} from "@/lib/report-export";
import { useReportPreviewScale } from "@/lib/use-report-preview-scale";
import { downloadWorkPhotosZip, mergePhotoState, type PhotoCategory } from "@/lib/pm-photos";
import {
  configurationBackup,
  diagColumns,
  diagDevices,
  environmentMain,
  environmentPower,
  environmentSecurity,
  serverChecklist,
  storageChecklist,
  switchChecklist,
  synapseSystem
} from "@/lib/pm-checklist-data";
import {
  getContractVisitTotal,
  getSiteContractAt,
  getSiteContractItems,
  getSiteContractLabel,
  getSiteProjectName,
  getUniquePmJobs,
  mergeWorkDetailsForContract,
  normalizeOwnerName,
  type CheckResult,
  type PmJobRecord,
  type PmWorkDetails,
  type ReportRow,
  type SavedChecklistBlock,
  type SavedChecklistField,
  type SavedChecklistGroup,
  type SavedChecklistSet,
  type SavedSparePart,
  type SiteCatalogRecord
} from "@/lib/pm-data";
import {
  getChecklistListLabel,
  getReportInfoFieldOrder,
  getReportSpareParts,
  isReportInfoBlock,
  resolveReportChecklistGroups
} from "@/lib/pm-report-helpers";
import { usePmData } from "@/lib/use-pm-data";
import { useOwnerFromUrl } from "@/lib/hooks/use-owner-from-url";
import { parseReportSection, type ReportSection } from "@/lib/report-section-nav";
import { ReportListPagination } from "@/components/reports/ReportListPagination";
import { useReportListPagination } from "@/lib/use-report-list-pagination";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { SchedulePlanReportPanel } from "@/components/reports/SchedulePlanReportPanel";
import { SiteInventoryReportPanel } from "@/components/reports/SiteInventoryReportPanel";
import { REPORT_EMAIL_RECIPIENT, sendReportByEmail } from "@/lib/report-delivery";
import { printReportPdf } from "@/lib/report-print-dialog";
import { ALL_CONTRACTS_INDEX, resolveReportContractIndices } from "@/lib/report-contract";
import {
  getPeriodRange,
  type ReportPeriodType
} from "@/lib/report-period";
import {
  ALL_OWNERS_VALUE,
  buildUniqueOwnerOptions,
  resolveActiveOwner
} from "@/lib/owner-filter";
type ChecklistTemplateKey = "synapse" | "server" | "switch" | "storage" | "environment" | "diag";

type ChecklistTemplate = {
  heading: string;
  key: ChecklistTemplateKey;
  title: string;
};

type PreviewState = {
  contractIndex: number;
  row: ReportRow;
  section: ReportSection;
  site: SiteCatalogRecord | null;
  title: string;
};


const photoUploadItems: { key: PhotoCategory; labelKey: "pm.devicePhoto" | "pm.overviewPhoto" | "pm.issuePhoto" | "pm.partPhoto" }[] = [
  { key: "device", labelKey: "pm.devicePhoto" },
  { key: "overview", labelKey: "pm.overviewPhoto" },
  { key: "issue", labelKey: "pm.issuePhoto" },
  { key: "part", labelKey: "pm.partPhoto" }
];

const checklistTemplates: ChecklistTemplate[] = [
  { key: "synapse", title: "Synapse", heading: "SYNAPSE PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "server", title: "Server", heading: "SERVER PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "switch", title: "Switch", heading: "SWITCH PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "storage", title: "Storage", heading: "STORAGE PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "environment", title: "Environment", heading: "ENVIRONMENT PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "diag", title: "DIAG", heading: "DIAGNOSTIC PREVENTIVE MAINTENANCE CHECKLIST" }
];

const companyContact = {
  address: "2521/34 Ladprao Road, Khwaeng Khlong Chao Khun Sing, Khet Wang Thonglang, Bangkok 10310",
  email: "service@jfadvancemed.com",
  phone: "02-583-8035",
  website: "www.jfadvancemed.com"
} as const;

const checklistTitleIcons: Record<string, LucideIcon> = {
  synapse: Server,
  server: Server,
  switch: Network,
  storage: HardDrive,
  environment: Leaf,
  diag: Stethoscope
};

const reportFieldIcons: Record<string, LucideIcon> = {
  "customer name": Hospital,
  location: MapPin,
  manufacturer: Server,
  brand: Building2,
  model: Monitor,
  "host name": Monitor,
  "s/n": Barcode,
  "s/n or s/t": Barcode,
  "ip address": Globe,
  mt: Wrench,
  "esx version": Cpu,
  "synapse version": Server,
  "license studies": ClipboardList,
  "current studies per year": ClipboardList,
  os: Monitor,
  "definition date": CalendarDays
};

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
          <ReportPreviewPage
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

                <ChecklistReportPanel
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

function ReportPhotosPreview({ workDetails }: { workDetails?: PmWorkDetails }) {
  const { t } = useUi();
  const photos = mergePhotoState(workDetails?.photos);
  const photoNotes = workDetails?.photoNotes ?? {};
  const categoriesWithContent = photoUploadItems.filter(
    (item) => photos[item.key].length > 0 || Boolean(photoNotes[item.key]?.trim())
  );
  const [activePhotoCategory, setActivePhotoCategory] = useState<PhotoCategory>(
    categoriesWithContent[0]?.key ?? "device"
  );
  const resolvedPhotoCategory =
    categoriesWithContent.length > 0
    && categoriesWithContent.some((item) => item.key === activePhotoCategory)
      ? activePhotoCategory
      : (categoriesWithContent[0]?.key ?? activePhotoCategory);
  const activePhotoItem = categoriesWithContent.find((item) => item.key === resolvedPhotoCategory)
    ?? categoriesWithContent[0];

  if (categoriesWithContent.length === 0) {
    return <p className="reportPhotoPreviewEmpty">{t("reports.noPhotosToDownload")}</p>;
  }

  return (
    <div className="reportPhotoPreviewPanel">
      <div className="tabs historyTabs reportPhotoTabs">
        {categoriesWithContent.map((item) => (
          <button
            className={item.key === resolvedPhotoCategory ? "activeTab" : "tab"}
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
        <div className="reportPhotoPreviewGroup">
          {photoNotes[activePhotoItem.key]?.trim() ? (
            <p className="reportPhotoPreviewNote">{photoNotes[activePhotoItem.key]}</p>
          ) : null}
          {photos[activePhotoItem.key].length > 0 ? (
            <div className="reportPhotoPreviewGrid">
              {photos[activePhotoItem.key].map((photo) => (
                <figure className="reportPhotoPreviewCard" key={photo.id}>
                  <img alt={photo.name} src={photo.dataUrl} />
                  <figcaption>{photo.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="reportPhotoPreviewEmpty">{t("reports.noPhotosToDownload")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ChecklistReportPanel({
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

type ReportField = { label: string; value?: string };
type FieldRow = ReportField[];

type StandardTemplatePage = ChecklistTemplate & {
  fields: string[][];
  sections: { items: string[]; title: string }[];
  variant?: "synapse" | "environment" | "equipment";
};

const standardTemplatePages: StandardTemplatePage[] = [
  {
    ...checklistTemplates[0],
    fields: [
      ["Customer Name :"],
      ["Synapse Version :", "Host Name :"],
      ["License Studies :", "Current studies Per year :"]
    ],
    sections: [
      { title: "SYNAPSE SYSTEM CHECKLIST", items: synapseSystem },
      { title: "CONFIGURATION BACKUP CHECKLIST", items: configurationBackup }
    ],
    variant: "synapse"
  },
  {
    ...checklistTemplates[1],
    fields: [
      ["Customer Name :"],
      ["Location :", "Manufacturer :"],
      ["Host Name :", "S/N or S/T :"],
      ["Model :", "IP Address :"],
      ["MT :", "ESX Version :"]
    ],
    sections: [{ title: "SERVER CHECKLIST", items: serverChecklist }],
    variant: "equipment"
  },
  {
    ...checklistTemplates[2],
    fields: [
      ["Customer Name :"],
      ["Location :", "Brand :"],
      ["Model :", "S/N :"],
      ["Host Name :", "IP Address :"]
    ],
    sections: [{ title: "SWITCH CHECKLIST", items: switchChecklist }],
    variant: "equipment"
  },
  {
    ...checklistTemplates[3],
    fields: [
      ["Customer Name :"],
      ["Location :", "Manufacturer :"],
      ["Model :", "S/N or S/T :"],
      ["MT :"]
    ],
    sections: [{ title: "STORAGE CHECKLIST", items: storageChecklist }],
    variant: "equipment"
  },
  {
    ...checklistTemplates[4],
    fields: [
      ["Customer Name :"],
      ["Location :"]
    ],
    sections: [
      { title: "ENVIRONMENT CHECKLIST", items: environmentMain },
      { title: "ENVIRONMENT CHECKLIST", items: environmentPower },
      { title: "SECURITY CHECKLIST", items: environmentSecurity }
    ],
    variant: "environment"
  }
];

function ReportDocumentPacket({
  contractIndex,
  pmJobs,
  responsibleName,
  responsibleSignature,
  row,
  site
}: {
  contractIndex: number;
  pmJobs: PmJobRecord[];
  responsibleName: string;
  responsibleSignature: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const contractIndices = useMemo(
    () => resolveReportContractIndices(site, contractIndex),
    [contractIndex, site]
  );

  return (
    <>
      {contractIndices.map((index) => (
        <ReportDocumentPacketForContract
          contractIndex={index}
          key={`contract-packet-${index}`}
          pmJobs={pmJobs}
          responsibleName={responsibleName}
          responsibleSignature={responsibleSignature}
          row={row}
          site={site}
        />
      ))}
    </>
  );
}

function ReportDocumentPacketForContract({
  contractIndex,
  pmJobs,
  responsibleName,
  responsibleSignature,
  row,
  site
}: {
  contractIndex: number;
  pmJobs: PmJobRecord[];
  responsibleName: string;
  responsibleSignature: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const reportRow = useMemo(() => ({
    ...row,
    workDetails: mergeWorkDetailsForContract(row.workDetails, contractIndex)
  }), [contractIndex, row]);
  const reportGroups = getReportGroups(reportRow.workDetails);

  return (
  <>
      <CoverTemplatePage
        contractIndex={contractIndex}
        groups={reportGroups}
        pmJobs={pmJobs}
        responsibleName={responsibleName}
        responsibleSignature={responsibleSignature}
        row={reportRow}
        site={site}
      />
      {reportGroups.map((group) => (
        group.sets.map((set, setIndex) => (
          <ChecklistSetPage
            group={group}
            key={`${contractIndex}-${group.key}-${set.title}-${setIndex}`}
            row={reportRow}
            set={set}
            site={site}
          />
        ))
      ))}
    </>
  );
}

function CoverTemplatePage({
  contractIndex,
  groups,
  pmJobs,
  responsibleName,
  responsibleSignature,
  row,
  site
}: {
  contractIndex: number;
  groups: SavedChecklistGroup[];
  pmJobs: PmJobRecord[];
  responsibleName: string;
  responsibleSignature: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const customerSignerName = row.workDetails?.signerName?.trim() || row.customer;
  const inspectorSignature = row.workDetails?.inspectorSignature?.trim() || responsibleSignature;
  const customerSignature = row.workDetails?.customerSignature?.trim() || "";
  const projectName = getSiteProjectName(site, contractIndex) || row.site;
  const visitRoundText = getVisitRoundText(pmJobs, row, site, contractIndex);

  const summaryNote = row.workDetails?.summaryNote?.trim() ?? "";

  return (
    <section className="templateSheet coverSheet">
      <TemplateHeader heading="Preventive Maintenance" icon={Wrench} row={row} />
      <div className="coverMetaStrip">
        <div className="coverMetaField">
          <span>วันที่</span>
          <strong>{row.date}</strong>
        </div>
        <div className="coverMetaField">
          <span>ครั้งที่</span>
          <strong>{visitRoundText}</strong>
        </div>
      </div>

      <div className="coverProjectList">
        <CoverProjectRow icon={ClipboardList} label="โครงการ" value={projectName} />
        <CoverProjectRow icon={Building2} label="หน่วยงาน" value={site?.department ?? ""} />
        <CoverProjectRow icon={Hospital} label="สถาบัน" value={row.customer} />
      </div>

      <div className="reportSectionCard coverDeviceSection">
        <div className="reportSectionHeading coverDeviceHeading">
          <ClipboardList size={15} />
          <span>รายละเอียดอุปกรณ์</span>
        </div>
        <table className="templateTable coverDeviceTable">
          <thead>
            <tr>
              <th>ลำดับที่</th>
              <th>รายการ</th>
              <th>จำนวน</th>
              <th>สถานะ</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={`${group.key}-${group.title}`}>
                <td>{index + 1}</td>
                <td>{getChecklistListLabel(group.key, group.title)}</td>
                <td>{group.sets.length}</td>
                <td className="reportStatusCell">
                  <ReportStatusLabel result="ok" />
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="coverSuggestionBlock">
        <div className="coverSuggestionHeading">
          <ClipboardList size={15} />
          ข้อเสนอแนะ
        </div>
        <p>{summaryNote || "\u00a0"}</p>
        <span className="coverSuggestionLine" aria-hidden="true" />
        <span className="coverSuggestionLine" aria-hidden="true" />
        <span className="coverSuggestionLine" aria-hidden="true" />
      </div>

      <div className="signatureGrid coverSignatureGrid">
        <SignaturePersonBox
          date={row.date}
          label="ผู้เข้าดำเนินการ"
          name={responsibleName || row.inspector}
          placeholder="ลายเซ็นผู้เข้าดำเนินการ"
          signature={inspectorSignature}
        />
        <SignaturePersonBox
          date={row.date}
          label="ผู้ตรวจสอบ"
          name={customerSignerName}
          placeholder="ลายเซ็นลูกค้า"
          signature={customerSignature}
        />
      </div>

      <CompanyContactFooter />
    </section>
  );
}

function CoverProjectRow({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="coverProjectRow">
      <div className="coverProjectLabel">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="coverProjectValue">{value}</div>
    </div>
  );
}

function SignaturePersonBox({
  date,
  label,
  name,
  placeholder,
  signature
}: {
  date: string;
  label: string;
  name: string;
  placeholder: string;
  signature?: string;
}) {
  return (
    <div className="coverSignatureCard">
      <strong>{label}</strong>
      <div className="coverSignatureSlot">
        {signature ? (
          <Image
            src={signature}
            alt={placeholder}
            width={220}
            height={54}
            unoptimized
          />
        ) : (
          <span className="coverSignaturePlaceholder">{placeholder}</span>
        )}
      </div>
      <div className="coverSignatureRule" aria-hidden="true" />
      <span>{name}</span>
      <span className="signatureDate">{date}</span>
    </div>
  );
}

function ChecklistSetPage({
  group,
  row,
  set,
  site
}: {
  group: SavedChecklistGroup;
  row: ReportRow;
  set: SavedChecklistSet;
  site: SiteCatalogRecord | null;
}) {
  const heading = getChecklistHeading(group.key, group.title);
  const showSetTitle = group.sets.length > 1 || !set.title.toLowerCase().includes(String(group.title).toLowerCase());
  const usesSidebar = group.key !== "environment";

  return (
    <section className="templateSheet">
      <TemplateHeader heading={heading} icon={checklistTitleIcons[group.key] ?? ClipboardList} row={row} />
      {showSetTitle ? <div className="templateSetTitle">{set.title}</div> : null}
      {group.key === "diag" ? (
        <DiagReportInfoGrid groupKey={group.key} row={row} set={set} site={site} />
      ) : (
        <ChecklistInfoSection fields={getSetInfoFields(group.key, row, set, site)} groupKey={group.key} row={row} site={site} />
      )}
      <div className={usesSidebar ? "templateBody withSidebar" : "templateBody footerSummary"}>
        <div className="templateMain">
          {set.blocks.map((block, blockIndex) => (
            group.key === "diag" && isDiagCalibrateBlock(block) ? (
              isFirstDiagCalibrateBlock(set.blocks, blockIndex) ? (
                <DiagCalibrateTable
                  blocks={getDiagCalibrateBlocks(set.blocks)}
                  groupKey={group.key}
                  key={`${set.title}-diag-calibrate`}
                  row={row}
                  setTitle={set.title}
                  site={site}
                />
              ) : null
            ) : shouldSkipReportBlock(group.key, block) ? null : (
              <ReportChecklistBlock
                block={block}
                blockIndex={blockIndex}
                groupKey={group.key}
                key={`${set.title}-${blockIndex}`}
                row={row}
                setTitle={set.title}
                site={site}
              />
            )
          ))}
        </div>
        {usesSidebar ? <ReportSummarySidebar row={row} /> : null}
      </div>
      {usesSidebar ? null : (
        <>
          <ReportSummaryBar row={row} />
          <ReportSparePartsBlock parts={getReportSpareParts(row.workDetails)} />
        </>
      )}
      <CompanyContactFooter />
    </section>
  );
}

function getSetInfoFields(
  groupKey: string,
  row: ReportRow,
  set: SavedChecklistSet,
  site: SiteCatalogRecord | null
) {
  const details = row.workDetails;
  const infoBlock = set.blocks.find(
    (block): block is Extract<SavedChecklistBlock, { type: "fields" }> => block.type === "fields" && isReportInfoBlock(block)
  );

  if (!infoBlock) {
    return [] as ReportField[];
  }

  const blockIndex = set.blocks.indexOf(infoBlock);

  return getVisibleReportFields(groupKey, infoBlock).map((field) => ({
    label: field.label,
    value: getReportFieldValue({
      blockIndex,
      details,
      field,
      groupKey,
      row,
      setTitle: set.title,
      site
    })
  }));
}

function ChecklistInfoSection({
  fields,
  groupKey,
  row,
  site
}: {
  fields: ReportField[];
  groupKey: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  if (fields.length === 0) {
    return null;
  }

  return <ReportInfoGrid fields={fields} groupKey={groupKey} row={row} site={site} />;
}

type DiagCalibrateBlockEntry = {
  block: Extract<SavedChecklistBlock, { type: "fields" }>;
  blockIndex: number;
};

function TemplateHeader({
  heading,
  icon: Icon = ClipboardList,
  row
}: {
  heading: string;
  icon?: LucideIcon;
  row?: ReportRow;
}) {
  return (
  <>
      <header className="templateBrandHeader templateBrandHeaderSheetCenter">
        <div className="reportBrandLogoSlot">
          <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={118} height={55} />
        </div>
        <p className="templateBrandText reportBrandTitleCenter">
          <strong>JF Advance Med CO., LTD</strong>
          <span>Service Report</span>
        </p>
        <div className="templateReportBadge reportBrandAside">
          <span className="templateReportBadgeLabel">SERVICE REPORT NO.</span>
          <strong>
            {row
              ? getDisplayPmOrderNo({
                  date: row.date,
                  jobId: row.jobId,
                  workDetails: row.workDetails
                })
              : ""}
          </strong>
          <span>วันที่ตรวจสอบ : {row?.date ?? ""}</span>
        </div>
      </header>
      <div className="templateTitleBanner">
        <span className="templateTitleBannerIcon">
          <Icon size={18} />
        </span>
        <strong>{heading}</strong>
      </div>
    </>
  );
}

function CompanyContactFooter() {
  return (
    <footer className="templateCompanyFooter">
      <div>
        <MapPin size={13} />
        <span>{companyContact.address}</span>
      </div>
      <div>
        <Phone size={13} />
        <span>{companyContact.phone}</span>
      </div>
      <div>
        <Mail size={13} />
        <span>{companyContact.email}</span>
      </div>
      <div>
        <Globe size={13} />
        <span>{companyContact.website}</span>
      </div>
    </footer>
  );
}

function ReportSparePartsBlock({ parts }: { parts: SavedSparePart[] }) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="reportSparePartsBlock">
      <strong>อะไหล่ที่เปลี่ยน :</strong>
      <span>1. {formatSparePart(parts[0])}</span>
      <span>2. {formatSparePart(parts[1])}</span>
    </div>
  );
}

function ReportSummarySidebar({ row }: { row: ReportRow }) {
  const details = row.workDetails;
  const finalStatus = details?.finalStatus ?? (row.result === "ผิดปกติ" ? "abnormal" : "normal");
  const spareParts = getReportSpareParts(details);

  return (
    <aside className="reportSummaryAside">
      <div className="reportSummaryCard">
        <div className="reportSummaryCardHeading">
          <BarChart3Icon />
          <span>SUMMARY</span>
        </div>
        <div className="reportSummaryResultBox">
          <span className="reportSummaryResultLabel">Overall Result</span>
          <div className={finalStatus === "abnormal" ? "reportOverallResult abnormal" : "reportOverallResult"}>
            <StatusMark variant={finalStatus === "abnormal" ? "bad" : "ok"} />
            <em>({finalStatus === "abnormal" ? "ผิดปกติ" : "ปกติ"})</em>
          </div>
        </div>
        <div className="reportRemarksBlock">
          <strong>หมายเหตุ :</strong>
          <p>{details?.summaryNote?.trim() ?? ""}</p>
          <span className="coverSuggestionLine" aria-hidden="true" />
          <span className="coverSuggestionLine" aria-hidden="true" />
          <span className="coverSuggestionLine" aria-hidden="true" />
        </div>
        <ReportSparePartsBlock parts={spareParts} />
      </div>

      <div className="reportWorkTimeCard">
        <div className="reportSummaryCardHeading">
          <Clock3 size={14} />
          <span>WORK TIME</span>
        </div>
        <table className="templateTable reportWorkTimeTable">
          <tbody>
            <tr>
              <th>Start Time</th>
              <td>{details?.startTime ?? row.startTime}</td>
            </tr>
            <tr>
              <th>Finish Time</th>
              <td>{details?.endTime ?? row.endTime}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function BarChart3Icon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 24 24" width="14">
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ReportSummaryBar({ row }: { row: ReportRow }) {
  const details = row.workDetails;
  const finalStatus = details?.finalStatus ?? (row.result === "ผิดปกติ" ? "abnormal" : "normal");

  return (
    <div className="reportSummaryBar">
      <div className="reportSummaryBarCard">
        <strong>SUMMARY OVERALL RESULT</strong>
        <div className={finalStatus === "abnormal" ? "reportOverallResult abnormal inline" : "reportOverallResult inline"}>
          <StatusMark variant={finalStatus === "abnormal" ? "bad" : "ok"} />
          <em>({finalStatus === "abnormal" ? "ผิดปกติ" : "ปกติ"})</em>
        </div>
      </div>
      <div className="reportWorkTimeCard inline">
        <div className="reportSummaryCardHeading">
          <Clock3 size={14} />
          <span>WORK TIME</span>
        </div>
        <table className="templateTable reportWorkTimeTable">
          <tbody>
            <tr>
              <th>Start Time</th>
              <td>{details?.startTime ?? row.startTime}</td>
            </tr>
            <tr>
              <th>Finish Time</th>
              <td>{details?.endTime ?? row.endTime}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateInfoGrid({ rows }: { rows: FieldRow[] }) {
  return (
    <table className="templateTable infoTemplateTable">
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.map((field) => field.label).join("-")}-${index}`}>
            {row.map((field) => (
              <td className="fieldCell" key={field.label}>
                <div className="fieldLabel">
                  <span>{formatFieldLabel(field.label)}</span>
                  <i>{field.value ?? ""}</i>
                </div>
              </td>
            ))}
            {row.length === 1 ? <td className="fieldCell" /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportChecklistBlock({
  block,
  blockIndex,
  groupKey,
  row,
  setTitle,
  site
}: {
  block: SavedChecklistBlock;
  blockIndex: number;
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const details = row.workDetails;
  const isEnvironment = groupKey === "environment";

  if (block.type === "fields") {
    if (shouldHideReportFieldBlock(groupKey, block)) {
      return null;
    }

    if (isReportInfoBlock(block) && groupKey !== "diag") {
      return null;
    }

    const fields = getVisibleReportFields(groupKey, block).map((field) => ({
      label: field.label,
      value: getReportFieldValue({
        blockIndex,
        details,
        field,
        groupKey,
        row,
        setTitle,
        site
      })
    }));

    if (isReportInfoBlock(block)) {
      return <ReportInfoGrid fields={fields} groupKey={groupKey} row={row} site={site} />;
    }

    return (
      <section className="reportFieldBlock">
        <TemplateInfoGrid rows={chunkReportFields(fields)} />
      </section>
    );
  }

  if (block.type === "radios") {
    const selectedValue = getReportRadioValue({
      block,
      blockIndex,
      details,
      groupKey,
      setTitle
    });

    return (
      <section className="templateBlockBox">
        <strong>{block.label}</strong>
        <div className="backupChoiceRow">
          {block.items.map((item) => (
            <label className="choiceItem" key={item}>
              <CheckBoxMark checked={item === selectedValue} />
              {item}
            </label>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "diagTable") {
    return (
      <div className="reportSectionCard">
        <div className="reportSectionHeading">
          <ClipboardList size={14} />
          <span>{block.title}</span>
        </div>
        <table className="templateTable diagDeviceTable">
          <thead>
            <tr>
              <th />
              {diagDevices.map((device) => <th key={device}>{device}</th>)}
            </tr>
          </thead>
          <tbody>
            {diagColumns.map((column) => (
              <tr key={column}>
                <th>{column}</th>
                {diagDevices.map((device) => {
                  const resultKey = `${groupKey}:${setTitle}:${blockIndex}:${device}:${column}`;
                  return (
                    <td className="reportStatusCell" key={`${column}-${device}`}>
                      <ReportStatusLabel result={details?.checkResults?.[resultKey]} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="reportSectionCard">
      <div className="reportSectionHeading">
        <ClipboardList size={14} />
        <span>{block.title}</span>
      </div>
      <table className={`templateTable checklistTemplateTable${isEnvironment ? " environmentChecklistTable" : ""}`}>
        <thead>
          <tr>
            {isEnvironment ? <th className="checklistNoCol">No.</th> : null}
            <th>{isEnvironment ? "รายการตรวจสอบ" : "Item"}</th>
            <th className="reportStatusCol">STATUS</th>
            <th>DETAIL</th>
          </tr>
        </thead>
        <tbody>
          {block.items.map((item, itemIndex) => {
            const resultKey = checkKey(`${groupKey}:${setTitle}:${blockIndex}`, block.title, item);
            const detail = getChecklistDetail({ details, groupKey, item, resultKey, setTitle });

            return (
              <tr key={item}>
                {isEnvironment ? <td className="checklistNoCol">{itemIndex + 1}</td> : null}
                <td>{item}</td>
                <td className="reportStatusCell">
                  <ReportStatusLabel
                    result={details?.checkResults?.[resultKey]}
                    thaiLabel={isEnvironment}
                  />
                </td>
                <td>{detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DiagCalibrateTable({
  blocks,
  groupKey,
  row,
  setTitle,
  site
}: {
  blocks: DiagCalibrateBlockEntry[];
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const details = row.workDetails;
  return (
    <div className="reportSectionCard">
      <div className="reportSectionHeading">
        <ClipboardList size={14} />
        <span>DIAGNOSTIC - CALIBRATION RESULT</span>
      </div>
      <table className="templateTable diagCalibrateTable">
      <thead>
        <tr>
          <th className="diagCalibrateTitle" colSpan={4}>CALIBRATE</th>
          <th colSpan={4}>LUMINANCE (cd/m²)</th>
        </tr>
        <tr>
          <th />
          <th>Brand /Model</th>
          <th>S/N</th>
          <th>Status</th>
          <th>Target<br />Min :</th>
          <th>Target<br />MAX :</th>
          <th>Result<br />Min :</th>
          <th>Result<br />MAX :</th>
        </tr>
      </thead>
      <tbody>
        {blocks.map((entry, index) => (
          <tr key={entry.block.title}>
            <th>Monitor {getDiagMonitorNumber(entry.block.title) ?? index + 1}</th>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("brand / model"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label === "s/n", groupKey, row, setTitle, site })}</td>
            <td className="reportStatusCell">
              <ReportStatusLabel result={details?.checkResults?.[diagCalibrateStatusKey(groupKey, setTitle, entry.blockIndex, entry.block.title)]} />
            </td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("target min"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("target max"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("result min"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("result max"), groupKey, row, setTitle, site })}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function isDiagCalibrateBlock(block: SavedChecklistBlock) {
  return block.type === "fields" && block.title.toLowerCase().startsWith("calibrate: monitor");
}

function isFirstDiagCalibrateBlock(blocks: SavedChecklistBlock[], blockIndex: number) {
  return blocks.findIndex(isDiagCalibrateBlock) === blockIndex;
}

function getDiagCalibrateBlocks(blocks: SavedChecklistBlock[]): DiagCalibrateBlockEntry[] {
  return blocks
    .map((block, blockIndex) => ({ block, blockIndex }))
    .filter((entry): entry is DiagCalibrateBlockEntry => isDiagCalibrateBlock(entry.block));
}

function getDiagMonitorNumber(title: string) {
  return title.match(/monitor\s*(\d+)/i)?.[1] ?? "";
}

function diagCalibrateStatusKey(groupKey: string, setTitle: string, blockIndex: number, title: string) {
  return `${groupKey}:calibrate-status:${setTitle}:${blockIndex}:${title}`;
}

function getDiagCalibrateValue({
  details,
  entry,
  fieldMatcher,
  groupKey,
  row,
  setTitle,
  site
}: {
  details: PmWorkDetails | undefined;
  entry: DiagCalibrateBlockEntry;
  fieldMatcher: (normalizedLabel: string) => boolean;
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const field = entry.block.fields.find((candidate) => fieldMatcher(normalizeCalibrateLabel(candidate.label)));

  if (!field) {
    return "";
  }

  return getReportFieldValue({
    blockIndex: entry.blockIndex,
    details,
    field,
    groupKey,
    row,
    setTitle,
    site
  });
}

function normalizeCalibrateLabel(label: string) {
  return label
    .replace(/\s+/g, " ")
    .replace(/Â²/g, "²")
    .trim()
    .toLowerCase();
}

function DiagReportInfoGrid({
  groupKey,
  row,
  set,
  site
}: {
  groupKey: string;
  row: ReportRow;
  set: SavedChecklistSet;
  site: SiteCatalogRecord | null;
}) {
  const details = row.workDetails;
  const radioEntry = set.blocks
    .map((block, blockIndex) => ({ block, blockIndex }))
    .find(({ block }) => block.type === "radios" && block.label === "Antivirus");
  const selectedAntivirus = radioEntry?.block.type === "radios"
    ? getReportRadioValue({
      block: radioEntry.block,
      blockIndex: radioEntry.blockIndex,
      details,
      groupKey,
      setTitle: set.title
    })
    : "Installed";
  const fieldValue = (label: string) => (
    getSavedFieldValueByLabel(details, groupKey, set.title, label) || getFallbackFieldValue(label, row, site)
  );

  return (
    <section className="reportInfoBlock diagInfoBlock">
      <div className="reportSectionHeading compact">
        <UserRound size={14} />
        <span>CUSTOMER INFORMATION</span>
      </div>
      <div className="reportIconGrid cols3">
        <ReportIconField label="Customer Name" value={fieldValue("Customer Name")} />
        <ReportIconField label="Location" value={fieldValue("Location")} />
        <ReportIconField label="Brand" value={fieldValue("Brand")} />
        <ReportIconField label="Model" value={fieldValue("Model")} />
        <ReportIconField label="S/N" value={fieldValue("S/N")} />
        <ReportIconField label="IP Address" value={fieldValue("IP Address")} />
        <ReportIconField label="OS" value={fieldValue("OS")} />
        <div className="reportIconField antivirusField">
          <span className="reportIconFieldIcon"><Monitor size={15} /></span>
          <span className="reportIconFieldBody">
            <em>Antivirus</em>
            <div className="diagCheckboxRow">
              {["Installed", "No Installation"].map((item) => (
                <label className="choiceItem" key={item}>
                  <CheckBoxMark checked={selectedAntivirus === item} />
                  {item}
                </label>
              ))}
            </div>
          </span>
        </div>
        <ReportIconField label="Definition Date" value={fieldValue("Definition Date")} />
      </div>
    </section>
  );
}

function ReportInfoGrid({
  fields,
  groupKey,
  row,
  site
}: {
  fields: ReportField[];
  groupKey: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const fieldValue = (label: string) => fields.find((field) => field.label === label)?.value ?? "";
  const orderedFieldLabels = getReportInfoFieldOrder(groupKey, fields);
  const displayFields = orderedFieldLabels.map((label) => ({
    label,
    value: label === "Customer Name"
      ? fieldValue("Customer Name") || getFallbackFieldValue("Customer Name", row, site)
      : fieldValue(label) || getFallbackFieldValue(label, row, site)
  }));

  if (groupKey === "environment") {
    const customerName = displayFields.find((field) => field.label === "Customer Name")?.value ?? "";
    const location = displayFields.find((field) => field.label === "Location")?.value ?? "";

    return (
      <section className="reportInfoBlock environmentInfoBlock">
        <ReportIconField label="Customer Name" value={customerName} variant="split" />
        <ReportIconField label="Location" value={location} variant="split" />
      </section>
    );
  }

  return (
    <section className={`reportInfoBlock equipmentInfoBlock${groupKey === "synapse" ? " synapseInfoBlock" : ""}`}>
      <div className={`reportIconGrid${groupKey === "synapse" ? " cols2" : " cols3"}`}>
        {displayFields.map((field) => (
          <ReportIconField key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </section>
  );
}

function getReportFieldIcon(label: string) {
  return reportFieldIcons[stripFieldColon(label).toLowerCase()] ?? ClipboardList;
}

function ReportIconField({
  label,
  value,
  variant = "grid"
}: ReportField & { variant?: "grid" | "split" }) {
  const normalizedLabel = stripFieldColon(label).toLowerCase();
  const displayValue = normalizedLabel === "running date" || normalizedLabel === "definition date"
    ? formatDefinitionDate(value ?? "")
    : value;
  const className = variant === "split" ? "reportIconField split" : "reportIconField";

  return (
    <div className={className}>
      <span className="reportIconFieldIcon">
        {createElement(getReportFieldIcon(label), { size: 15 })}
      </span>
      <span className="reportIconFieldBody">
        <em>{stripFieldColon(label)}</em>
        <strong>{displayValue ?? ""}</strong>
      </span>
    </div>
  );
}


function shouldSkipReportBlock(groupKey: string, block: SavedChecklistBlock) {
  if (groupKey !== "diag") {
    return false;
  }

  return (block.type === "fields" && (block.title === "DIAG INFORMATION" || block.title === "DEFINITION DATE"))
    || (block.type === "radios" && block.label === "Antivirus");
}

function shouldHideReportFieldBlock(groupKey: string, block: Extract<SavedChecklistBlock, { type: "fields" }>) {
  return groupKey === "synapse" && block.title === "FREE SPACE (GB)";
}

function getVisibleReportFields(groupKey: string, block: Extract<SavedChecklistBlock, { type: "fields" }>) {
  if (groupKey === "synapse") {
    return block.fields.filter((field) => field.label !== "Antivirus Definition Date");
  }

  return block.fields;
}

function getChecklistDetail({
  details,
  groupKey,
  item,
  resultKey,
  setTitle
}: {
  details: PmWorkDetails | undefined;
  groupKey: string;
  item: string;
  resultKey: string;
  setTitle: string;
}) {
  const synapseDetail = getSynapseChecklistDetail(details, groupKey, setTitle, item);

  if (synapseDetail !== null) {
    return synapseDetail;
  }

  return details?.checkNotes?.[resultKey] ?? "";
}

function getSynapseChecklistDetail(details: PmWorkDetails | undefined, groupKey: string, setTitle: string, item: string) {
  if (groupKey !== "synapse") {
    return null;
  }

  const normalizedItem = item.trim().toLowerCase();

  if (normalizedItem === "free space capacity: database o:") {
    return formatFreeTotalDetail(
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Database O: Free (GB)"),
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Database O: Total (GB)")
    );
  }

  if (normalizedItem === "free space capacity: warm database") {
    return formatFreeTotalDetail(
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Warm DB Free (GB)"),
      getSavedFieldValueByLabel(details, groupKey, setTitle, "Warm DB Total (GB)")
    );
  }

  if (normalizedItem === "antivirus definition" || normalizedItem === "antivirus definition date") {
    const definitionDate = getSavedFieldValueByLabels(details, groupKey, setTitle, ["Antivirus Definition Date", "Definition Date"]);
    return ["Definition Date", formatDefinitionDate(definitionDate)].filter(Boolean).join(" ");
  }

  return null;
}

function formatFreeTotalDetail(freeValue: string, totalValue: string) {
  return freeValue || totalValue ? `Free/Total(GB) ${freeValue}/${totalValue}` : "";
}

function formatDefinitionDate(value: string) {
  const dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return dateParts ? `${dateParts[3]}/${dateParts[2]}/${dateParts[1]}` : value;
}

function getSavedFieldValueByLabel(
  details: PmWorkDetails | undefined,
  groupKey: string,
  setTitle: string,
  label: string
) {
  return getSavedFieldValueByLabels(details, groupKey, setTitle, [label]);
}

function getSavedFieldValueByLabels(
  details: PmWorkDetails | undefined,
  groupKey: string,
  setTitle: string,
  labels: string[]
) {
  const fieldValues = details?.fieldValues;

  if (!fieldValues) {
    return "";
  }

  const keyPrefix = `${groupKey}:field:${setTitle}:`;

  for (const label of labels) {
    const keySuffix = `:${label}`;
    const value = Object.entries(fieldValues).find(([key]) => key.startsWith(keyPrefix) && key.endsWith(keySuffix))?.[1] ?? "";

    if (value) {
      return value;
    }
  }

  return "";
}


function CheckBoxMark({ checked = false }: { checked?: boolean }) {
  return <span className="checkbox">{checked ? <StatusMark variant="ok" compact /> : ""}</span>;
}

function StatusMark({ compact = false, variant }: { compact?: boolean; variant: CheckResult }) {
  return (
    <span
      aria-label={variant === "ok" ? "Normal" : "Abnormal"}
      className={["reportMark", variant === "ok" ? "reportMarkCheck" : "reportMarkCross", compact ? "compact" : ""].filter(Boolean).join(" ")}
    />
  );
}

function getReportGroups(details: PmWorkDetails | undefined): SavedChecklistGroup[] {
  return resolveReportChecklistGroups(details) ?? buildFallbackChecklistGroups();
}

function buildFallbackChecklistGroups(): SavedChecklistGroup[] {
  const standardGroups = standardTemplatePages.map<SavedChecklistGroup>((template) => ({
    key: template.key,
    title: template.title,
    sets: [{
      title: `${template.title.toUpperCase()} #1`,
      blocks: [
        {
          type: "fields",
          title: `${template.title.toUpperCase()} INFORMATION`,
          fields: template.fields.flat().map((label) => ({ label: stripFieldColon(label) }))
        },
        ...template.sections.map((section) => ({
          type: "checks" as const,
          title: section.title,
          items: section.items
        }))
      ]
    }]
  }));

  return [
    ...standardGroups,
    {
      key: "diag",
      title: "DIAG",
      sets: [{
        title: "DIAG #1",
        blocks: [
          {
            type: "fields",
            title: "DIAG INFORMATION",
            fields: ["Customer Name", "Location", "Brand", "Model", "S/N", "IP Address", "OS", "Antivirus", "Definition Date"].map((label) => ({ label }))
          },
          { type: "diagTable", title: "รายการตรวจสอบอุปกรณ์" }
        ]
      }]
    }
  ];
}

function getChecklistHeading(key: string, title: string) {
  return checklistTemplates.find((template) => template.key === key)?.heading ?? `${title.toUpperCase()} PREVENTIVE MAINTENANCE CHECKLIST`;
}

function chunkReportFields(fields: ReportField[]) {
  const rows: FieldRow[] = [];

  for (let index = 0; index < fields.length; index += 2) {
    rows.push(fields.slice(index, index + 2));
  }

  return rows;
}

function getReportFieldValue({
  blockIndex,
  details,
  field,
  groupKey,
  row,
  setTitle,
  site
}: {
  blockIndex: number;
  details: PmWorkDetails | undefined;
  field: SavedChecklistField;
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const savedValue = details?.fieldValues?.[fieldKey(groupKey, setTitle, blockIndex, field.label)];

  if (savedValue?.trim()) {
    return savedValue;
  }

  if (field.value?.trim()) {
    return field.value;
  }

  return getFallbackFieldValue(field.label, row, site);
}

function getReportRadioValue({
  block,
  blockIndex,
  details,
  groupKey,
  setTitle
}: {
  block: Extract<SavedChecklistBlock, { type: "radios" }>;
  blockIndex: number;
  details: PmWorkDetails | undefined;
  groupKey: string;
  setTitle: string;
}) {
  return details?.radioValues?.[radioKey(groupKey, setTitle, blockIndex, block.label)] ?? block.items[0] ?? "";
}

function getFallbackFieldValue(label: string, row: ReportRow, site: SiteCatalogRecord | null) {
  const normalizedLabel = stripFieldColon(label).toLowerCase();

  if (normalizedLabel === "customer name") {
    return row.customer;
  }

  if (normalizedLabel === "location") {
    return site?.address || site?.department || row.province;
  }

  if (normalizedLabel === "pm order no" || normalizedLabel === "pm order no.") {
    return getDisplayPmOrderNo({
      date: row.date,
      jobId: row.jobId,
      workDetails: row.workDetails
    });
  }

  return "";
}

function formatFieldLabel(label: string) {
  const trimmedLabel = label.trim();
  return trimmedLabel.endsWith(":") ? trimmedLabel : `${trimmedLabel} :`;
}

function stripFieldColon(label: string) {
  return label.trim().replace(/\s*:$/, "");
}

function fieldKey(groupKey: string, setTitle: string, blockIndex: number, label: string) {
  return `${groupKey}:field:${setTitle}:${blockIndex}:${label}`;
}

function radioKey(groupKey: string, setTitle: string, blockIndex: number, label: string) {
  return `${groupKey}:radio:${setTitle}:${blockIndex}:${label}`;
}

function checkKey(resultPrefix: string, title: string, item: string) {
  return `${resultPrefix}:${title}:${item}`;
}

function ReportStatusLabel({
  result,
  thaiLabel = false
}: {
  result?: CheckResult;
  thaiLabel?: boolean;
}) {
  const variant = result === "bad" ? "bad" : "ok";
  const label = variant === "bad"
    ? (thaiLabel ? "ผิดปกติ" : "Abnormal")
    : (thaiLabel ? "ปกติ" : "Normal");

  return (
    <span className={`reportStatusLabel ${variant === "bad" ? "abnormal" : "normal"}`}>
      <StatusMark compact variant={variant} />
      <span>{label}</span>
    </span>
  );
}


function formatSparePart(part: SavedSparePart | undefined) {
  if (!part) {
    return "";
  }

  return [part.name, part.quantity ? `(${part.quantity})` : "", part.note].filter(Boolean).join(" ");
}

function getStoredUserSignature(email: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getUserSignatureStorageKey(email)) ?? "";
}

function ReportPreviewPage({
  onClose,
  onContractIndexChange,
  pmJobs,
  preview,
  responsibleName,
  responsibleSignature
}: {
  onClose: () => void;
  onContractIndexChange: (contractIndex: number) => void;
  pmJobs: PmJobRecord[];
  preview: PreviewState;
  responsibleName: string;
  responsibleSignature: string;
}) {
  const { t } = useUi();
  const [exportMessage, setExportMessage] = useState("");
  const [exportHint, setExportHint] = useState(false);
  const contracts = getSiteContractItems(preview.site);

  const { viewportRef, scaleShellRef, documentRef } = useReportPreviewScale(true);

  const getReportExportContent = useCallback(() => {
    return getReportExportHtml(documentRef.current);
  }, []);

  const openReportPrintDialog = useCallback((options?: { forPdfDownload?: boolean }) => {
    const content = getReportExportContent();

    if (!content) {
      setExportHint(false);
      setExportMessage("ไม่พบเนื้อหารายงาน กรุณากดพรีวิวแล้วลองใหม่ หรือรอสักครู่แล้วลองอีกครั้ง");
      return false;
    }

    const didPrint = printReportPdf(
      prepareOfficeExportContentSync(content),
      getReportExportTitle(preview.row)
    );

    if (!didPrint) {
      setExportHint(false);
      setExportMessage("ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาลองใหม่อีกครั้ง");
      return false;
    }

    if (options?.forPdfDownload) {
      setExportHint(true);
      setExportMessage(
        `เปิดหน้าต่างพิมพ์แล้ว — เลือก Save as PDF / บันทึกเป็น PDF ชื่อไฟล์ควรเป็น "${getReportExportTitle(preview.row)}"`
      );
    } else {
      setExportHint(false);
      setExportMessage("");
    }

    return true;
  }, [getReportExportContent, preview.row]);

  const sendReportEmail = useCallback(async () => {
    const content = getReportExportContent();

    if (!content) {
      setExportHint(false);
      setExportMessage(t("reports.exportEmpty"));
      return;
    }

    setExportHint(false);

    try {
      const title = getReportExportTitle(preview.row);
      const result = await sendReportByEmail({
        title,
        htmlContent: prepareOfficeExportContentSync(content)
      });

      if (result === "sent") {
        setExportHint(true);
        setExportMessage(t("reports.sendEmailSuccess").replace("{email}", REPORT_EMAIL_RECIPIENT));
        return;
      }

      setExportHint(true);
      setExportMessage(t("reports.sendEmailComingSoon").replace("{email}", REPORT_EMAIL_RECIPIENT));
    } catch {
      setExportMessage(t("reports.sendEmailFailed"));
    }
  }, [getReportExportContent, preview.row, t]);

  const exportReportPdf = () => {
    setExportHint(false);
    openReportPrintDialog({ forPdfDownload: true });
  };

  const exportReportPhotos = () => {
    setExportHint(false);

    const didDownload = downloadWorkPhotosZip({
      archiveName: getReportExportTitle(preview.row),
      photosValue: preview.row.workDetails?.photos
    });

    if (!didDownload) {
      setExportMessage(t("reports.noPhotosToDownload"));
      return;
    }

    setExportMessage("");
  };

  return (
    <div className="reportEditorPage reportEditorPagePreview">
      <header className="reportEditorHeader reportEditorHeaderPreview">
        <button
          aria-label={t("common.back")}
          className="reportEditorBackButton"
          type="button"
          onClick={onClose}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="reportEditorHeaderMain">
          <h1>{preview.title}</h1>
          <label className="reportEditorContractField">
            <span>{t("pm.selectContract")}</span>
            <AppSelect className="select" value={String(preview.contractIndex)} onChange={(event) => onContractIndexChange(Number(event.target.value))}>
              <option value={String(ALL_CONTRACTS_INDEX)}>{t("common.all")}</option>
              {contracts.map((contract, index) => (
                <option key={index} value={index}>{getSiteContractLabel(contract, index)}</option>
              ))}
            </AppSelect>
          </label>
        </div>
        <div className="reportEditorHeaderActions">
          <button className="button subtle" type="button" onClick={sendReportEmail}>
            <Mail size={16} />
            {t("reports.sendEmail")}
          </button>
          <ReportExportMenu onExportPdf={exportReportPdf} onExportPhotos={exportReportPhotos} />
        </div>
      </header>

      {exportMessage ? (
        <p className={exportHint ? "reportExportMessage reportExportHint" : "reportExportMessage"}>{exportMessage}</p>
      ) : null}

      <div
        ref={viewportRef}
        className="reportPreviewViewport"
        aria-hidden={false}
      >
        <div ref={scaleShellRef} className="reportPreviewScaleShell">
          <div ref={documentRef} className="reportDocumentStack">
            <ReportDocumentPacket
              contractIndex={preview.contractIndex}
              pmJobs={pmJobs}
              responsibleName={responsibleName}
              responsibleSignature={responsibleSignature}
              row={preview.row}
              site={preview.site}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getVisitRoundText(pmJobs: PmJobRecord[], row: ReportRow, site: SiteCatalogRecord | null, contractIndex = 0) {
  const matchedJob = getMatchingReportJob(pmJobs, row);
  const visitRound = getVisitRoundForReport(pmJobs, row);
  const selectedContract = getSiteContractAt(site, contractIndex);
  const visitTotal = getContractVisitTotal(selectedContract, matchedJob?.pmCycle);

  return `${visitRound}/${visitTotal || "-"}`;
}

function getMatchingReportJob(pmJobs: PmJobRecord[], row: ReportRow) {
  const rowDate = toInputDate(row.date);

  return pmJobs.find((job) => job.id === row.jobId)
    ?? pmJobs.find((job) => job.siteId === row.siteId && job.visitDate === rowDate)
    ?? null;
}

function getVisitRoundForReport(pmJobs: PmJobRecord[], row: ReportRow) {
  const rowDate = toInputDate(row.date);
  const uniqueJobs = getUniquePmJobs(pmJobs.filter((job) => job.siteId === row.siteId))
    .sort((first, second) => (
      first.visitDate.localeCompare(second.visitDate) ||
      first.visitTime.localeCompare(second.visitTime)
    ));
  const jobIndex = uniqueJobs.findIndex((job) => job.id === row.jobId);

  if (jobIndex >= 0) {
    return jobIndex + 1;
  }

  return uniqueJobs.findIndex((job) => job.visitDate === rowDate) + 1 || 1;
}

function rowMatchesFilters({
  endDate,
  ownerFilter,
  owners,
  query,
  result,
  resultFilter,
  rowDate,
  searchableText,
  startDate
}: {
  endDate: string;
  ownerFilter: string;
  owners: string[];
  query: string;
  result: ReportRow["result"];
  resultFilter?: string;
  rowDate: string;
  searchableText: string;
  startDate: string;
}) {
  const matchesQuery = query.trim() ? searchableText.toLowerCase().includes(query.trim().toLowerCase()) : true;
  const matchesOwner = ownerFilter === ALL_OWNERS_VALUE
    ? true
    : owners.some((owner) => normalizeOwnerName(owner) === normalizeOwnerName(ownerFilter));
  const matchesResult = resultFilter ? result === resultFilter : true;
  const matchesStart = startDate ? rowDate >= startDate : true;
  const matchesEnd = endDate ? rowDate <= endDate : true;

  return matchesQuery && matchesOwner && matchesResult && matchesStart && matchesEnd;
}

function toInputDate(date: string) {
  const [day, month, year] = date.split("/");
  return year && month && day ? `${year}-${month}-${day}` : date;
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}
