"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Eye,
  MapPin,
  Printer,
  UserRound,
  X
} from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { useUi, type Lang } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
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
  normalizeOwnerName,
  type ReportRow,
  type SiteCatalogRecord
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

type ChecklistTemplateKey = "synapse" | "server" | "switch" | "storage" | "environment" | "diag";

type ChecklistTemplate = {
  heading: string;
  key: ChecklistTemplateKey;
  title: string;
};

type PreviewState = { title: string };

const allOwnersValue = "__all";

const checklistTemplates: ChecklistTemplate[] = [
  { key: "synapse", title: "Synapse", heading: "Synapse Preventive Maintenance Checklist" },
  { key: "server", title: "Server", heading: "Server Preventive Maintenance Checklist" },
  { key: "switch", title: "Switch", heading: "Switch Preventive Maintenance Checklist" },
  { key: "storage", title: "Storage", heading: "Storage Preventive Maintenance Checklist" },
  { key: "environment", title: "Environment", heading: "Environment Preventive Maintenance Checklist" },
  { key: "diag", title: "DIAG", heading: "DIAG Preventive Maintenance Checklist" }
];

export default function ReportsPage() {
  const { lang, t } = useUi();
  const { data, error, isLoading } = usePmData();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(allOwnersValue);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const ownerOptions = useMemo(() => getOwnerOptions(data.reportRows, data.siteCatalog), [data.reportRows, data.siteCatalog]);
  const filteredReports = useMemo(() => (
    data.reportRows.filter((row) => rowMatchesFilters({
      endDate,
      ownerFilter,
      query,
      rowDate: toInputDate(row.date),
      searchableText: `${row.site} ${row.customer} ${row.inspector} ${row.province}`,
      startDate,
      owners: row.inspector.split(", ")
    }))
  ), [data.reportRows, endDate, ownerFilter, query, startDate]);
  const openReportPreview = (row: ReportRow) => {
    setPreview({ title: `รายงาน PM - ${row.site}` });
  };

  return (
    <AppShell>
      <div className="reportsPage">
        <FeedbackPopups loading={isLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error} />
        <PageTitle title={t("reports.title")} subtitle={t("reports.subtitle")} />

        <section className="toolbar reportToolbar">
          <SearchControl placeholder={t("reports.searchInput")} value={query} onChange={setQuery} />
          <label className="dateField">
            {t("reports.startDate")}
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="dateField">
            {t("reports.endDate")}
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <select className="select" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value={allOwnersValue}>{t("common.all")}</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </section>

        <ChecklistReportPanel
          filteredReports={filteredReports}
          lang={lang}
          onPreviewReport={openReportPreview}
        />

        {preview ? (
          <PreviewModal
            preview={preview}
            onClose={() => setPreview(null)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ChecklistReportPanel({
  filteredReports,
  lang,
  onPreviewReport
}: {
  filteredReports: ReportRow[];
  lang: Lang;
  onPreviewReport: (row: ReportRow) => void;
}) {
  const { t } = useUi();

  return (
    <section className="reportListPanel reportListOnly">
      <div className="panelTitleRow">
        <h2>{t("reports.reportList")}</h2>
        <span>{filteredReports.length}</span>
      </div>
      <div className="rows reportRows">
        {filteredReports.length > 0 ? filteredReports.map((row) => (
          <button
            aria-label={`${t("reports.preview")} ${row.site}`}
            className="row reportListRow"
            key={row.id}
            type="button"
            onClick={() => onPreviewReport(row)}
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
            <span className="reportPreviewCue">
              <Eye size={14} />
              {t("reports.preview")}
            </span>
          </button>
        )) : <EmptyState message={t("reports.empty")} />}
      </div>
    </section>
  );
}

type FieldRow = string[];

type StandardTemplatePage = ChecklistTemplate & {
  fields: FieldRow[];
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

function ReportDocumentPacket() {
  return (
    <div className="reportDocumentStack">
      <CoverTemplatePage />
      {standardTemplatePages.map((template) => (
        <StandardTemplatePageView key={template.key} template={template} />
      ))}
      <DiagTemplatePage />
    </div>
  );
}

function CoverTemplatePage() {
  return (
    <section className="templateSheet coverSheet">
      <div className="coverServiceText">Service Report</div>
      <Image className="coverLogo" src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={360} height={168} />
      <h2>Preventive Maintenance</h2>
      <p className="coverRound">ครั้งที่ ........ / ........</p>

      <table className="templateTable coverInfoTable">
        <tbody>
          <tr>
            <th>โครงการ</th>
            <td />
          </tr>
          <tr>
            <th>หน่วยงาน</th>
            <td />
          </tr>
          <tr>
            <th>สถาบัน</th>
            <td />
          </tr>
        </tbody>
      </table>

      <table className="templateTable coverDeviceTable">
        <thead>
          <tr>
            <th colSpan={5}>รายละเอียดอุปกรณ์</th>
          </tr>
          <tr>
            <th>ลำดับที่</th>
            <th>รายการ</th>
            <th>จำนวน</th>
            <th>สถานะ</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {["Synapse PM Checklist", "Server PM Checklist", "Switch PM Checklist", "Storage PM Checklist", "Environment PM Checklist", "DIAG PM Checklist"].map((item, index) => (
            <tr key={item}>
              <td>{index + 1}</td>
              <td>{item}</td>
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <section className="coverSuggestion">
        <strong>ข้อเสนอแนะ</strong>
        <span />
        <span />
      </section>

      <div className="signatureGrid">
        <div>
          <strong>ผู้เข้าดำเนินการ</strong>
          <span>ลายเซ็น</span>
        </div>
        <div>
          <strong>ผู้ตรวจสอบ</strong>
          <span>ลายเซ็น</span>
        </div>
      </div>
    </section>
  );
}

function StandardTemplatePageView({ template }: { template: StandardTemplatePage }) {
  return (
    <section className="templateSheet">
      <TemplateHeader heading={template.heading} />
      <TemplateInfoGrid fields={template.fields} />
      <ReferenceRows />

      {template.sections.map((section, index) => (
        <ChecklistTemplateTable key={`${template.key}-${section.title}-${index}`} items={section.items} title={section.title} />
      ))}

      {template.variant === "synapse" ? <SynapseBackupBlock /> : null}
      <TemplateFooter compact={template.variant === "environment"} />
    </section>
  );
}

function TemplateHeader({ heading }: { heading: string }) {
  return (
    <header className="templateHeader">
      <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={132} height={62} />
      <strong>JF Advance Med CO., LTD</strong>
      <div>
        <span>Service Report</span>
        <b>{heading}</b>
      </div>
    </header>
  );
}

function TemplateInfoGrid({ fields }: { fields: FieldRow[] }) {
  return (
    <table className="templateTable infoTemplateTable">
      <tbody>
        {fields.map((row, index) => (
          <tr key={`${row.join("-")}-${index}`}>
            {row.map((field) => (
              <td className="fieldCell" key={field}>
                <div className="fieldLabel">
                  <span>{field}</span>
                  <i />
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

function ReferenceRows() {
  return (
    <table className="templateTable referenceTable">
      <tbody>
        <tr>
          <td>เล่มที่/เลขที่</td>
          <td />
        </tr>
        <tr>
          <td>อ้างอิงใบรายงานผลการบริการ</td>
          <td>/</td>
        </tr>
      </tbody>
    </table>
  );
}

function ChecklistTemplateTable({ items, title }: { items: string[]; title: string }) {
  return (
    <table className="templateTable checklistTemplateTable">
      <thead>
        <tr>
          <th>{title}</th>
          <th>STATUS</th>
          <th>DETAIL</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item}>
            <td>{item}</td>
            <td />
            <td />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SynapseBackupBlock() {
  return (
    <section className="templateBlockBox">
      <strong>BACKUP DEVICE / DATA BACKUP CHECKING</strong>
      <div className="backupChoiceRow">
        <span>Backup Type :</span>
        <label className="choiceItem"><span className="checkbox" />DR Site</label>
        <label className="choiceItem"><span className="checkbox" />NAS</label>
        <label className="choiceItem"><span className="checkbox" />Other</label>
      </div>
      {["Location :", "Hardware Status :", "Backup Status :", "Runing Date :"].map((label) => (
        <div className="lineRow" key={label}>
          <span>{label}</span>
          <i />
        </div>
      ))}
    </section>
  );
}

function TemplateFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "templateFooter compactFooter" : "templateFooter"}>
      <div className="footerTopGrid">
        <div className="suggestionBox">
          <strong>ข้อเสนอแนะ :</strong>
        </div>
        <div className="checkedByBox">
          <div className="checkedByTitle">Checked By :</div>
          <div className="checkedByValue" />
        </div>
      </div>
      <div className="statusBlock">
        <div className="statusRow">
          <span>สรุปผลการดำเนินงาน :</span>
          <label className="statusOption"><span className="checkbox" />สภาพปกติ</label>
          <label className="statusOption"><span className="checkbox" />ผิดปกติ</label>
        </div>
        <div className="noteLine">
          <span>หมายเหตุ :</span>
          <span />
        </div>
      </div>
      <div className="partsBox">
        <span>อะไหล่ที่เปลี่ยน :</span>
        <span>1.</span>
        <span>2.</span>
      </div>
      <div className="workTimeGrid">
        <div>
          <strong>STATUS</strong>
          <span>√ : Normal</span>
          <span>X : Abnormal</span>
        </div>
        <div>
          <strong>Work Time</strong>
          <span>เวลาเริ่มงาน</span>
          <span>เวลาเสร็จงาน</span>
        </div>
      </div>
    </footer>
  );
}

function DiagTemplatePage() {
  return (
    <section className="templateSheet diagSheet">
      <TemplateHeader heading="DIAG Preventive Maintenance Checklist" />
      <TemplateInfoGrid fields={[
        ["Customer Name :", "Location :"],
        ["Brand :", "Model :"],
        ["S/N :", "IP Address :"],
        ["OS :", "Antivirus :"],
        ["Definition Date :"]
      ]} />
      <ReferenceRows />

      <table className="templateTable diagCalibrateTable">
        <thead>
          <tr>
            <th colSpan={6}>CALIBRATE</th>
          </tr>
          <tr>
            <th>Monitor</th>
            <th>Brand / Model</th>
            <th>S/N</th>
            <th>Status</th>
            <th colSpan={2}>LUMINANCE (cd/m2)</th>
          </tr>
          <tr>
            <th />
            <th />
            <th />
            <th />
            <th>Target</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monitor 1</td>
            <td />
            <td />
            <td />
            <td>Min : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MAX :</td>
            <td>Min : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MAX :</td>
          </tr>
          <tr>
            <td>Monitor 2</td>
            <td />
            <td />
            <td />
            <td>Min : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MAX :</td>
            <td>Min : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MAX :</td>
          </tr>
        </tbody>
      </table>

      <section className="templateBlockBox">
        <strong>DIAGNOSTIC MONITOR / SMPTE PATTERN</strong>
        <div className="lineRow"><span>สถานะการทดสอบ :</span><i /></div>
        <div className="lineRow"><span>(ผิดปกติระบุอาการ)</span><i /></div>
      </section>

      <section className="templateBlockBox">
        <strong>PHYSICAL STATUS</strong>
        {["Act. Times", "Backlight Times", "Manufacturing date"].map((label) => (
          <div className="dualMonitorRow" key={label}>
            <span>{label}</span>
            <b>Monitor1:</b>
            <i />
            <b>Monitor2:</b>
            <i />
          </div>
        ))}
      </section>

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
              {diagDevices.map((device) => <td key={`${column}-${device}`} />)}
            </tr>
          ))}
        </tbody>
      </table>

      <TemplateFooter compact />
    </section>
  );
}

// `chunkFields` removed — templates now provide explicit row definitions (FieldRow[])

function PreviewModal({ preview, onClose }: { preview: PreviewState; onClose: () => void }) {
  const { t } = useUi();

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={preview.title}>
      <article className="modal previewModal">
        <div className="modalHeader">
          <h2>{preview.title}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}><X size={18} /></button>
        </div>
        <ReportDocumentPacket />
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

function getOwnerOptions(reportRows: ReportRow[], siteCatalog: SiteCatalogRecord[]) {
  const owners = [
    ...reportRows.flatMap((row) => row.inspector.split(", ")),
    ...siteCatalog.map((site) => site.owner)
  ];
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
}

function rowMatchesFilters({
  endDate,
  ownerFilter,
  owners,
  query,
  rowDate,
  searchableText,
  startDate
}: {
  endDate: string;
  ownerFilter: string;
  owners: string[];
  query: string;
  rowDate: string;
  searchableText: string;
  startDate: string;
}) {
  const matchesQuery = query.trim() ? searchableText.toLowerCase().includes(query.trim().toLowerCase()) : true;
  const matchesOwner = ownerFilter === allOwnersValue
    ? true
    : owners.some((owner) => normalizeOwnerName(owner) === normalizeOwnerName(ownerFilter));
  const matchesStart = startDate ? rowDate >= startDate : true;
  const matchesEnd = endDate ? rowDate <= endDate : true;

  return matchesQuery && matchesOwner && matchesStart && matchesEnd;
}

function toInputDate(date: string) {
  const [day, month, year] = date.split("/");
  return year && month && day ? `${year}-${month}-${day}` : date;
}

function EmptyState({ message }: { message: string }) {
  return <p className="emptyState">{message}</p>;
}
