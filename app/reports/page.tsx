"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Download,
  Eye,
  MapPin,
  Printer,
  UserRound,
  X
} from "lucide-react";
import { AppShell, PageTitle, SearchControl } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import { useUi, type Lang } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import { getDisplayPmOrderNo } from "@/lib/pm-order-no";
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
import { usePmData } from "@/lib/use-pm-data";

type ChecklistTemplateKey = "synapse" | "server" | "switch" | "storage" | "environment" | "diag";

type ChecklistTemplate = {
  heading: string;
  key: ChecklistTemplateKey;
  title: string;
};

type PreviewState = {
  contractIndex: number;
  row: ReportRow;
  site: SiteCatalogRecord | null;
  title: string;
};

const allOwnersValue = "__all";

const checklistTemplates: ChecklistTemplate[] = [
  { key: "synapse", title: "Synapse", heading: "Synapse Maintenance Checklist" },
  { key: "server", title: "Server", heading: "Server Maintenance Checklist" },
  { key: "switch", title: "Switch", heading: "Switch Maintenance Checklist" },
  { key: "storage", title: "Storage", heading: "Storage Maintenance Checklist" },
  { key: "environment", title: "Environment", heading: "Environment Maintenance Checklist" },
  { key: "diag", title: "DIAG", heading: "DIAG Maintenance Checklist" }
];

export default function ReportsPage() {
  const { lang, t } = useUi();
  const { email, signature, userName } = useCurrentUser();
  const { data, error, isLoading } = usePmData();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(allOwnersValue);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const responsibleName = userName.trim() || email || "";
  const responsibleSignature = signature || getStoredUserSignature(email);
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
    setPreview({
      contractIndex: 0,
      row,
      site: data.siteCatalog.find((site) => site.id === row.siteId) ?? null,
      title: `รายงาน PM - ${row.site}`
    });
  };

  return (
    <AppShell>
      <div className="reportsPage">
        <FeedbackPopups loading={isLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error} />
        <PageTitle title={t("reports.title")} subtitle={t("reports.subtitle")} />

        <section className="toolbar reportToolbar">
          <div className="reportFilterField">
            <span>{t("common.search")}</span>
            <SearchControl placeholder={t("reports.searchInput")} value={query} onChange={setQuery} />
          </div>
          <label className="dateField">
            {t("reports.startDate")}
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="dateField">
            {t("reports.endDate")}
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label className="reportFilterField">
            <span>{t("common.inspector")}</span>
            <select className="select" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value={allOwnersValue}>{t("common.all")}</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </label>
        </section>

        <ChecklistReportPanel
          filteredReports={filteredReports}
          lang={lang}
          onPreviewReport={openReportPreview}
        />

        {preview ? (
          <PreviewModal
            pmJobs={data.pmJobs}
            preview={preview}
            responsibleName={responsibleName}
            responsibleSignature={responsibleSignature}
            onClose={() => setPreview(null)}
            onContractIndexChange={(contractIndex) => setPreview((current) => current ? { ...current, contractIndex } : current)}
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
            {/* <span className="reportPreviewCue">
              <Eye size={14} />
              {t("reports.preview")}
            </span> */}
          </button>
        )) : <EmptyState message={t("reports.empty")} />}
      </div>
    </section>
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
  const reportGroups = getReportGroups(row.workDetails);

  return (
    <div className="reportDocumentStack">
      <CoverTemplatePage
        contractIndex={contractIndex}
        groups={reportGroups}
        pmJobs={pmJobs}
        responsibleName={responsibleName}
        responsibleSignature={responsibleSignature}
        row={row}
        site={site}
      />
      {reportGroups.map((group) => (
        group.sets.map((set, setIndex) => (
          <ChecklistSetPage
            group={group}
            key={`${group.key}-${set.title}-${setIndex}`}
            row={row}
            set={set}
            site={site}
          />
        ))
      ))}
    </div>
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

  return (
    <section className="templateSheet coverSheet">
      <TemplateHeader heading="Preventive Maintenance" row={row} />
      <table className="templateTable coverInfoTable">
        <tbody>
          <tr>
            <th>โครงการ</th>
            <td>{projectName}</td>
          </tr>
          <tr>
            <th>หน่วยงาน</th>
            <td>{site?.department ?? ""}</td>
          </tr>
          <tr>
            <th>สถาบัน</th>
            <td>{row.customer}</td>
          </tr>
          <tr>
            <th>ครั้งที่ตรวจสอบ</th>
            <td>{visitRoundText}</td>
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
          {groups.map((group, index) => (
            <tr key={`${group.key}-${group.title}`}>
              <td>{index + 1}</td>
              <td>{getChecklistHeading(group.key, group.title)}</td>
              <td>{group.sets.length}</td>
              <td className="reportStatusCell"><StatusMark variant="ok" /></td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="signatureGrid">
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
    </section>
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
      <div className="coverSignatureLine">
        {signature ? (
          <Image
            src={signature}
            alt={placeholder}
            width={220}
            height={54}
            unoptimized
          />
        ) : placeholder}
      </div>
      <span>{name}</span>
      <span>{date}</span>
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

  return (
    <section className="templateSheet">
      <TemplateHeader heading={heading} row={row} />
      {showSetTitle ? <div className="templateSetTitle">{set.title}</div> : null}
      {group.key === "diag" ? (
        <DiagReportInfoGrid groupKey={group.key} row={row} set={set} site={site} />
      ) : null}
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
      <TemplateFooter
        compact={group.key === "environment" || group.key === "diag"}
        row={row}
      />
    </section>
  );
}

type DiagCalibrateBlockEntry = {
  block: Extract<SavedChecklistBlock, { type: "fields" }>;
  blockIndex: number;
};

function TemplateHeader({ heading, row }: { heading: string; row?: ReportRow }) {
  return (
    <header className="templateHeader">
      <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={132} height={62} />
      <strong>{heading}</strong>
      <div>
        <span>JF Advance Med CO., LTD</span>
        <span>PM Order No. : {row ? getDisplayPmOrderNo(row) : ""}</span>
        <span>{row?.date ?? ""}</span>
      </div>
    </header>
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

  if (block.type === "fields") {
    if (shouldHideReportFieldBlock(groupKey, block)) {
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
                    {resultSymbol(details?.checkResults?.[resultKey])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="templateTable checklistTemplateTable">
      <thead>
        <tr>
          <th>{block.title}</th>
          <th>STATUS</th>
          <th>DETAIL</th>
        </tr>
      </thead>
      <tbody>
        {block.items.map((item) => {
          const resultKey = checkKey(`${groupKey}:${setTitle}:${blockIndex}`, block.title, item);

          return (
            <tr key={item}>
              <td>{item}</td>
              <td className="reportStatusCell">{resultSymbol(details?.checkResults?.[resultKey])}</td>
              <td>{getChecklistDetail({ details, groupKey, item, resultKey, setTitle })}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
            <td className="reportStatusCell">{resultSymbol(details?.checkResults?.[diagCalibrateStatusKey(groupKey, setTitle, entry.blockIndex, entry.block.title)])}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("target min"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("target max"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("result min"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("result max"), groupKey, row, setTitle, site })}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
    <section className="reportInfoBlock">
      <div className="reportCustomerRow">
        <strong>Customer Name :</strong>
        <span>{fieldValue("Customer Name")}</span>
      </div>
      <div className="reportInfoGrid">
        <ReportFieldValue label="Location" value={fieldValue("Location")} />
        <ReportFieldValue label="Brand" value={fieldValue("Brand")} />
        <ReportFieldValue label="Model" value={fieldValue("Model")} />
        <ReportFieldValue label="S/N" value={fieldValue("S/N")} />
        <ReportFieldValue label="IP Address" value={fieldValue("IP Address")} />
        <ReportFieldValue label="OS" value={fieldValue("OS")} />
        <div className="fieldLabel diagAntivirusField">
          <span>Antivirus :</span>
          <div className="diagCheckboxRow">
            {["Installed", "No Installation"].map((item) => (
              <label className="choiceItem" key={item}>
                <CheckBoxMark checked={selectedAntivirus === item} />
                {item}
              </label>
            ))}
          </div>
        </div>
        <ReportFieldValue label="Definition Date" value={fieldValue("Definition Date")} />
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
  const customerName = fieldValue("Customer Name") || getFallbackFieldValue("Customer Name", row, site);
  const orderedFields = getReportInfoFieldOrder(groupKey, fields)
    .map((label) => ({ label, value: fieldValue(label) }))
    .filter((field) => field.label !== "Customer Name");

  return (
    <section className="reportInfoBlock">
      <div className="reportCustomerRow">
        <strong>Customer Name :</strong>
        <span>{customerName}</span>
      </div>
      <div className="reportInfoGrid">
        {orderedFields.map((field) => (
          <ReportFieldValue key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </section>
  );
}

function ReportFieldValue({ label, value }: ReportField) {
  const displayValue = stripFieldColon(label).toLowerCase() === "running date"
    ? formatDefinitionDate(value ?? "")
    : value;

  return (
    <div className="fieldLabel">
      <span>{formatFieldLabel(label)}</span>
      <i>{displayValue ?? ""}</i>
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

function isReportInfoBlock(block: Extract<SavedChecklistBlock, { type: "fields" }>) {
  return block.title.includes("INFORMATION");
}

function getReportInfoFieldOrder(groupKey: string, fields: ReportField[]) {
  const fallbackOrder = fields.map((field) => field.label);
  const orders: Record<string, string[]> = {
    environment: ["Customer Name", "Location"],
    server: ["Customer Name", "Location", "Manufacturer", "Host Name", "S/N or S/T", "Model", "IP Address", "MT", "ESX Version"],
    storage: ["Customer Name", "Location", "Manufacturer", "Model", "S/N or S/T", "MT"],
    switch: ["Customer Name", "Location", "Brand", "Model", "S/N", "Host Name", "IP Address"],
    synapse: ["Customer Name", "Synapse Version", "Host Name", "License Studies", "Current Studies Per Year"]
  };
  const preferredOrder = orders[groupKey] ?? fallbackOrder;
  const knownLabels = new Set(fields.map((field) => field.label));

  return [
    ...preferredOrder.filter((label) => knownLabels.has(label)),
    ...fallbackOrder.filter((label) => !preferredOrder.includes(label))
  ];
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

function TemplateFooter({
  compact = false,
  row
}: {
  compact?: boolean;
  row: ReportRow;
}) {
  const details = row.workDetails;
  const finalStatus = details?.finalStatus ?? (row.result === "ผิดปกติ" ? "abnormal" : "normal");
  const spareParts = details?.spareParts?.filter((part) => part.name.trim() || part.quantity.trim() || part.note.trim()) ?? [];

  return (
    <footer className={compact ? "templateFooter compactFooter" : "templateFooter"}>
      <div className="statusBlock">
        <div className="statusRow">
          <span>สรุปผลการดำเนินงาน :</span>
          <label className="statusOption"><CheckBoxMark checked={finalStatus === "normal"} />สภาพปกติ</label>
          <label className="statusOption"><CheckBoxMark checked={finalStatus === "abnormal"} />ผิดปกติ</label>
        </div>
        <div className="noteLine">
          <span>หมายเหตุ :</span>
          <span>{details?.summaryNote ?? ""}</span>
        </div>
      </div>
      {spareParts.length > 0 ? (
        <div className="partsBox">
          <span>อะไหล่ที่เปลี่ยน :</span>
          <span>1. {formatSparePart(spareParts[0])}</span>
          <span>2. {formatSparePart(spareParts[1])}</span>
        </div>
      ) : null}
      <div className="footerBottomGrid">
        <div className="workTimeGrid">
          <div>
            <strong>STATUS</strong>
            <span><StatusMark variant="ok" compact /> : Normal</span>
            <span><StatusMark variant="bad" compact /> : Abnormal</span>
          </div>
          <div>
            <strong>Work Time</strong>
            <span>เวลาเริ่มงาน {details?.startTime ?? row.startTime}</span>
            <span>เวลาเสร็จงาน {details?.endTime ?? row.endTime}</span>
          </div>
        </div>
      </div>
    </footer>
  );
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
  const snapshot = details?.checklistSnapshot?.filter((group) => group.sets.length > 0);
  return snapshot && snapshot.length > 0 ? snapshot : buildFallbackChecklistGroups();
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
  return checklistTemplates.find((template) => template.key === key)?.heading ?? `${title} Maintenance Checklist`;
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
    return getDisplayPmOrderNo(row);
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

function resultSymbol(result: CheckResult | undefined) {
  if (result === "ok") {
    return <StatusMark variant="ok" />;
  }

  if (result === "bad") {
    return <StatusMark variant="bad" />;
  }

  return <StatusMark variant="ok" />;
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

function PreviewModal({
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
  const documentRef = useRef<HTMLDivElement | null>(null);
  const [downloadType, setDownloadType] = useState<"pdf" | "word" | "excel">("pdf");
  const [showPreview, setShowPreview] = useState(false);
  const contracts = getSiteContractItems(preview.site);
  const selectedContract = getSiteContractAt(preview.site, preview.contractIndex);
  const selectedContractLabel = getSiteContractLabel(selectedContract, preview.contractIndex);
  const printReport = () => {
    printReportPdf(documentRef.current?.innerHTML ?? "", `${preview.title} - ${selectedContractLabel}`);
  };
  const downloadReport = async () => {
    if (downloadType === "pdf") {
      printReport();
      return;
    }

    const html = await prepareOfficeExportContent(documentRef.current?.innerHTML ?? "");
    const isExcel = downloadType === "excel";
    const extension = isExcel ? "xls" : "doc";
    const mimeType = isExcel ? "application/vnd.ms-excel;charset=utf-8" : "application/msword;charset=utf-8";
    const blob = new Blob([
      "\ufeff",
      buildExportHtml(html, `${preview.title} - ${selectedContractLabel}`, isExcel ? "excel" : "word")
    ], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(preview.row.site)}-${selectedContractLabel}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <article className="modal previewModal">
        <div className="modalHeader">
          <h2>{preview.title}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}><X size={18} /></button>
        </div>
        {!showPreview ? (
          <div className="reportModalControls">
            <label className="label">
              เลือกสัญญา
              <select className="select" value={preview.contractIndex} onChange={(event) => onContractIndexChange(Number(event.target.value))}>
                {contracts.map((contract, index) => (
                  <option key={index} value={index}>{getSiteContractLabel(contract, index)}</option>
                ))}
              </select>
            </label>
            <label className="label">
              ประเภทไฟล์
              <select className="select" value={downloadType} onChange={(event) => setDownloadType(event.target.value as "pdf" | "word" | "excel")}>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
              </select>
            </label>
            <button className="button subtle" type="button" onClick={printReport}>
              <Printer size={16} />
              {t("common.print")}
            </button>
            <button className="button subtle" type="button" onClick={downloadReport}>
              <Download size={16} />
              {t("common.download")}
            </button>
            <button className="button primary" type="button" onClick={() => setShowPreview(true)}>
              <Eye size={16} />
              {t("reports.preview")}
            </button>
          </div>
        ) : null}
        <div ref={documentRef} className={showPreview ? undefined : "reportDocumentHidden"} aria-hidden={!showPreview}>
          <ReportDocumentPacket
            contractIndex={preview.contractIndex}
            pmJobs={pmJobs}
            responsibleName={responsibleName}
            responsibleSignature={responsibleSignature}
            row={preview.row}
            site={preview.site}
          />
        </div>
      </article>
    </div>
  );
}

async function prepareOfficeExportContent(content: string) {
  if (!content.trim()) {
    return "";
  }

  const container = document.createElement("div");
  container.innerHTML = content;
  const images = Array.from(container.querySelectorAll("img"));

  await Promise.all(images.map(async (image) => {
    const source = image.getAttribute("src");

    image.removeAttribute("srcset");
    image.removeAttribute("sizes");

    if (!source) {
      return;
    }

    if (source.startsWith("data:image/png")) {
      return;
    }

    const absoluteSource = new URL(source, window.location.origin).href;

    try {
      image.setAttribute("src", await imageUrlToPngDataUrl(absoluteSource));
    } catch {
      image.setAttribute("src", absoluteSource);
    }
  }));

  return container.innerHTML;
}

function imageUrlToPngDataUrl(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");

      if (!context || width <= 0 || height <= 0) {
        reject(new Error("Cannot prepare export image."));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };

    image.onerror = () => reject(new Error("Cannot load export image."));
    image.crossOrigin = "anonymous";
    image.src = source;
  });
}

function buildExportHtml(content: string, title: string, exportType: "word" | "excel") {
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <head>
    <meta charset="utf-8">
    <base href="${window.location.origin}">
    <title>${escapeHtml(title)}</title>
    ${exportType === "word" ? getWordOfficeXml() : getExcelOfficeXml()}
    <style>${getPrintableStyles()}${getOfficeExportStyles(exportType)}</style>
  </head>
  <body>
    <main class="reportsPage printReportRoot officeExportRoot ${exportType === "excel" ? "excelExportRoot" : "wordExportRoot"}">${content}</main>
  </body>
</html>`;
}

function printReportPdf(content: string, title: string) {
  if (!content.trim()) {
    return;
  }

  const printWindow = window.open("", "_blank", "width=960,height=900");

  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPdfPrintHtml(content, title));
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  const waitForImages = Array.from(printWindow.document.images).map((image) => (
    image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      })
  ));

  Promise.all(waitForImages).then(() => {
    window.setTimeout(triggerPrint, 250);
  });
}

function buildPdfPrintHtml(content: string, title: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <base href="${window.location.origin}">
    <title>${escapeHtml(title)}</title>
    <style>${getPrintableStyles()}</style>
  </head>
  <body>
    <main class="reportsPage printReportRoot">${content}</main>
  </body>
</html>`;
}

function getPrintableStyles() {
  const appStyles = Array.from(document.styleSheets).flatMap((sheet) => {
    try {
      return Array.from(sheet.cssRules).map((rule) => rule.cssText);
    } catch {
      return [];
    }
  }).join("\n");

  return `${appStyles}
@page {
  size: A4;
  margin: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #ffffff !important;
}

.printReportRoot {
  width: 210mm;
  margin: 0 auto;
  background: #ffffff !important;
}

.printReportRoot .reportDocumentStack {
  display: block !important;
  padding: 0 !important;
}

.printReportRoot .templateSheet {
  width: 210mm !important;
  min-height: 297mm !important;
  margin: 0 auto !important;
  padding: 10mm 13mm !important;
  box-shadow: none !important;
  page-break-after: always;
  break-after: page;
  box-sizing: border-box;
}

.printReportRoot .templateSheet:last-child {
  page-break-after: auto;
  break-after: auto;
}

.printReportRoot * {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}`;
}

function getOfficeExportStyles(exportType: "word" | "excel") {
  const officeRootClass = exportType === "excel" ? "excelExportRoot" : "wordExportRoot";

  return `
.officeExportRoot {
  width: 210mm;
  margin: 0 auto;
  background: #ffffff !important;
}

.officeExportRoot .reportDocumentStack {
  display: block !important;
  padding: 0 !important;
}

.officeExportRoot .templateSheet {
  width: 210mm !important;
  min-height: 297mm !important;
  margin: 0 auto 0 auto !important;
  padding: 10mm 13mm !important;
  box-shadow: none !important;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
  mso-page-orientation: portrait;
}

.officeExportRoot .templateSheet:last-child {
  page-break-after: auto;
  break-after: auto;
}

.officeExportRoot .templateTable,
.officeExportRoot table {
  border-collapse: collapse;
}

.officeExportRoot img {
  max-width: 100%;
}

.${officeRootClass} * {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}`;
}

function getWordOfficeXml() {
  return `<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->`;
}

function getExcelOfficeXml() {
  return `<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>PM Report</x:Name>
        <x:WorksheetOptions>
          <x:Print>
            <x:ValidPrinterInfo/>
            <x:PaperSizeIndex>9</x:PaperSizeIndex>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "pm-report";
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
