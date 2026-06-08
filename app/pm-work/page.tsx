"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock3,
  ClipboardCheck,
  MapPin,
  MessageSquare,
  Navigation,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useUi, type Lang } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import {
  readSitePmChecklistConfig,
  type PmChecklistConfig,
  type PmChecklistKey
} from "@/lib/pm-checklist-config";
import {
  checklistTabs,
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
import { getDateString, getWorkSiteById, getWorkSitesByDate, statusMeta, type SiteRecord } from "@/lib/mock-data";

type CheckResult = "ok" | "bad";
type FinalStatus = "normal" | "abnormal";
type PhotoKey = "device" | "overview" | "issue" | "part";
type PhotoState = Record<PhotoKey, string[]>;
type SparePart = {
  id: number;
  name: string;
  quantity: string;
  note: string;
};
type ChecklistField = {
  label: string;
  placeholder?: string;
  value?: string;
};

type ChecklistBlock =
  | { type: "fields"; title: string; fields: ChecklistField[]; columns?: "two" | "three" | "four" }
  | { type: "checks"; title: string; items: string[] }
  | { type: "radios"; label: string; items: string[] }
  | { type: "diagTable"; title: string };

type ChecklistSet = {
  title: string;
  blocks: ChecklistBlock[];
};

type ConfiguredChecklistGroup = {
  key: PmChecklistKey;
  title: string;
  sets: ChecklistSet[];
};

const statusLabelKeys: Record<SiteRecord["status"], string> = {
  completed: "workStatus.completed",
  inProgress: "workStatus.inProgress",
  pending: "workStatus.pending",
  abnormal: "workStatus.abnormal"
};
const photoUploadItems: { key: PhotoKey; labelKey: string }[] = [
  { key: "device", labelKey: "pm.devicePhoto" },
  { key: "overview", labelKey: "pm.overviewPhoto" },
  { key: "issue", labelKey: "pm.issuePhoto" },
  { key: "part", labelKey: "pm.partPhoto" }
];
const emptyPhotoState: PhotoState = {
  device: [],
  overview: [],
  issue: [],
  part: []
};

export default function PmWorkPage() {
  return (
    <Suspense fallback={<PmWorkFallback />}>
      <PmWorkContent />
    </Suspense>
  );
}

function PmWorkFallback() {
  const { t } = useUi();

  return (
    <AppShell>
      <div className="pmWorkPage">
        <PageTitle title={t("pm.title")} subtitle={t("pm.loadingSubtitle")} />
      </div>
    </AppShell>
  );
}

function PmWorkContent() {
  const { t } = useUi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteIdParam = searchParams.get("siteId");
  const todayDate = useMemo(() => getDateString(), []);

  const [activeTab, setActiveTab] = useState<PmChecklistKey>("synapse");

  const selectedSite = useMemo(
    () => siteIdParam ? getWorkSiteById(siteIdParam) : null,
    [siteIdParam]
  );

  const openSite = (site: SiteRecord) => {
    router.push(`/pm-work?siteId=${encodeURIComponent(site.id)}`);
  };

  const closeDetail = () => {
    router.push("/pm-work");
  };

  const filteredSites = getWorkSitesByDate(todayDate);

  return (
    <AppShell>
      <div className="pmWorkPage">
        {selectedSite ? (
          <DetailView site={selectedSite} activeTab={activeTab} setActiveTab={setActiveTab} onBack={closeDetail} />
        ) : (
          <>
            <PageTitle title={t("pm.title")} subtitle={`${t("pm.todayOnlySubtitle")} · ${todayDate}`} />
            <section className="list">
              {filteredSites.length > 0 ? filteredSites.map((site) => {
                const status = statusMeta[site.status];
                return (
                  <button className="listRow" key={site.id} type="button" onClick={() => openSite(site)}>
                    <div>
                      <strong>{site.site}</strong>
                      <span className={`statusPill ${status.className}`}>{t(statusLabelKeys[site.status])}</span>
                    </div>
                    <small>
                      <UserRound size={13} /> {site.customer}
                      <CalendarDays size={13} /> {site.visitDate}
                      <Clock3 size={13} /> {site.visitTime}
                      <MapPin size={13} /> {site.province}
                    </small>
                    <ChevronRight size={18} />
                  </button>
                );
              }) : <p className="emptyState">{t("pm.noTodayJobs")}</p>}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function DetailView({
  site,
  activeTab,
  setActiveTab,
  onBack
}: {
  site: SiteRecord;
  activeTab: PmChecklistKey;
  setActiveTab: (value: PmChecklistKey) => void;
  onBack: () => void;
}) {
  const { lang, t } = useUi();
  const status = statusMeta[site.status];
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});
  const [checklistConfig, setChecklistConfig] = useState<PmChecklistConfig>(() => readSitePmChecklistConfig(site.id));
  const [photos, setPhotos] = useState<PhotoState>(emptyPhotoState);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [additionalDetail, setAdditionalDetail] = useState("");
  const [inspectorNote, setInspectorNote] = useState("");
  const [finalStatus, setFinalStatus] = useState<FinalStatus | null>(null);
  const [summaryNote, setSummaryNote] = useState("");
  const [signerName, setSignerName] = useState("");
  const configuredGroups = useMemo(() => buildConfiguredChecklistGroups(checklistConfig, lang), [checklistConfig, lang]);
  const group = configuredGroups.find((item) => item.key === activeTab) ?? configuredGroups[0];

  useEffect(() => {
    const refreshConfig = () => setChecklistConfig(readSitePmChecklistConfig(site.id));

    refreshConfig();
    window.addEventListener("focus", refreshConfig);
    window.addEventListener("storage", refreshConfig);
    return () => {
      window.removeEventListener("focus", refreshConfig);
      window.removeEventListener("storage", refreshConfig);
    };
  }, [site.id]);

  useEffect(() => {
    if (configuredGroups.length > 0 && !configuredGroups.some((item) => item.key === activeTab)) {
      setActiveTab(configuredGroups[0].key);
    }
  }, [activeTab, configuredGroups, setActiveTab]);

  const setCheckResult = (item: string, result: CheckResult) => {
    setCheckResults((current) => {
      const next = { ...current };
      if (next[item] === result) {
        delete next[item];
      } else {
        next[item] = result;
      }
      return next;
    });
  };
  const addPhotoFiles = (key: PhotoKey, fileList: FileList | null) => {
    const names = Array.from(fileList ?? []).map((file) => file.name);
    if (names.length === 0) {
      return;
    }

    setPhotos((current) => ({
      ...current,
      [key]: [...current[key], ...names]
    }));
  };
  const addSparePart = () => {
    setSpareParts((current) => [
      ...current,
      { id: Date.now(), name: "", quantity: "1", note: "" }
    ]);
  };
  const updateSparePart = (id: number, field: keyof Omit<SparePart, "id">, value: string) => {
    setSpareParts((current) => (
      current.map((part) => (part.id === id ? { ...part, [field]: value } : part))
    ));
  };
  const removeSparePart = (id: number) => {
    setSpareParts((current) => current.filter((part) => part.id !== id));
  };

  return (
    <div className="detailPage">
      <div className="detailTitle">
        <button className="backButton" type="button" onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>{site.site}</h1>
          <p>{site.customer} · {site.visitDate}</p>
        </div>
        <span className={`statusPill ${status.className}`}>{t(statusLabelKeys[site.status])}</span>
      </div>

      <section className="card">
        <h2><Wrench size={17} /> {t("pm.siteInfo")}</h2>
        <div className="infoGrid">
          <Info label={t("common.customer")} value={site.customer} />
          <Info label={t("pm.phoneShort")} value={site.phone} />
          <Info label={t("common.province")} value={site.province} />
          <Info label={t("pm.region")} value={site.region} />
          <Info label={t("common.owner")} value={site.owner} />
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
            <input className="field" type="time" />
          </label>
          <label className="label">
            {t("fields.endTime")}
            <input className="field" type="time" />
          </label>
          <label className="label">
            {t("common.inspector")}
            <input className="field" defaultValue={site.owner} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2><ClipboardCheck size={17} /> {t("pm.checklist")}</h2>
        <div className="tabs">
          {configuredGroups.map((tab) => (
            <button className={tab.key === activeTab ? "activeTab" : "tab"} type="button" key={tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.title}
            </button>
          ))}
        </div>
        {group ? (
          <div className="templateList">
            {group.sets.map((set) => (
              <section className="templateSet" key={set.title}>
                <h3 className="checkSectionTitle">{set.title}</h3>
                {set.blocks.map((block, blockIndex) => (
                  <ChecklistBlockView
                    key={`${set.title}-${blockIndex}`}
                    block={block}
                    resultPrefix={`${group.key}:${set.title}:${blockIndex}`}
                    site={site}
                    checkResults={checkResults}
                    setCheckResult={setCheckResult}
                  />
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p className="emptyChecklist">{t("pm.noChecklist")}</p>
        )}
      </section>

      <section className="card">
        <h2><Camera size={17} /> {t("pm.photos")}</h2>
        <div className="photoActions">
          {photoUploadItems.map((item) => (
            <PhotoUploadButton
              key={item.key}
              label={t(item.labelKey)}
              fileNames={photos[item.key]}
              onChange={(fileList) => addPhotoFiles(item.key, fileList)}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <h2><Wrench size={17} /> {t("pm.parts")}</h2>
        <div className="partsList">
          {spareParts.map((part, index) => (
            <div className="partRow" key={part.id}>
              <label className="label">
                {t("fields.sparePart")} #{index + 1}
                <input
                  className="field"
                  value={part.name}
                  onChange={(event) => updateSparePart(part.id, "name", event.target.value)}
                  placeholder={t("fields.sparePartName")}
                />
              </label>
              <label className="label">
                {t("fields.quantity")}
                <input
                  className="field"
                  value={part.quantity}
                  onChange={(event) => updateSparePart(part.id, "quantity", event.target.value)}
                  placeholder={t("fields.quantity")}
                />
              </label>
              <label className="label">
                {t("common.note")}
                <input
                  className="field"
                  value={part.note}
                  onChange={(event) => updateSparePart(part.id, "note", event.target.value)}
                  placeholder={t("fields.additionalDetail")}
                />
              </label>
              <button className="iconButton removePartButton" type="button" onClick={() => removeSparePart(part.id)} aria-label={`${t("common.close")} ${t("fields.sparePart")}`}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button className="addLineButton" type="button" onClick={addSparePart}>
          <Plus size={15} />
          {t("pm.addPart")}
        </button>
      </section>

      <section className="card">
        <h2><MessageSquare size={17} /> {t("pm.suggestions")}</h2>
        <div className="noteStack">
          <label className="label">
            {t("pm.suggestions")}
            <textarea className="textarea" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} />
          </label>
          <label className="label">
            {t("fields.additionalDetail")}
            <textarea className="textarea" value={additionalDetail} onChange={(event) => setAdditionalDetail(event.target.value)} />
          </label>
          <label className="label">
            {t("fields.inspectorNote")}
            <textarea className="textarea" value={inspectorNote} onChange={(event) => setInspectorNote(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2><CircleCheck size={17} /> {t("pm.result")}</h2>
        <div className="summaryChoices">
          <button
            className={finalStatus === "normal" ? "summaryChoice selected ok" : "summaryChoice"}
            type="button"
            onClick={() => setFinalStatus(finalStatus === "normal" ? null : "normal")}
          >
            <CircleCheck size={18} />
            <strong>{t("pm.normalCondition")}</strong>
          </button>
          <button
            className={finalStatus === "abnormal" ? "summaryChoice selected bad" : "summaryChoice"}
            type="button"
            onClick={() => setFinalStatus(finalStatus === "abnormal" ? null : "abnormal")}
          >
            <CircleX size={18} />
            <strong>{t("common.abnormal")}</strong>
          </button>
        </div>
        <label className="label">
          {t("common.note")}
          <textarea className="textarea" value={summaryNote} onChange={(event) => setSummaryNote(event.target.value)} />
        </label>
      </section>

      <section className="card">
        <h2><PenLine size={17} /> {t("pm.signature")}</h2>
        <label className="label">
          {t("fields.signerName")}
          <input className="field" value={signerName} onChange={(event) => setSignerName(event.target.value)} />
        </label>
        <SignaturePad />
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

function PhotoUploadButton({
  label,
  fileNames,
  onChange
}: {
  label: string;
  fileNames: string[];
  onChange: (fileList: FileList | null) => void;
}) {
  const { t } = useUi();

  return (
    <label className="photoUploadButton">
      <span>
        <Upload size={15} />
        {label}
      </span>
      {fileNames.length > 0 && <small>{fileNames.length} {t("common.files")}</small>}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          onChange(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function SignaturePad() {
  const { t } = useUi();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const setupCanvas = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#0f172a";
      context.lineWidth = 2.4;
      context.lineCap = "round";
      context.lineJoin = "round";
    };

    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, []);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };
  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }

    const point = getPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };
  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  };

  return (
    <div className="signaturePad">
      <span>{t("pm.signaturePad")}</span>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <button className="button ghost clearSignatureButton" type="button" onClick={clearSignature}>
        <RotateCcw size={15} />
        {t("pm.clearSignature")}
      </button>
    </div>
  );
}

function ChecklistBlockView({
  block,
  resultPrefix,
  site,
  checkResults,
  setCheckResult
}: {
  block: ChecklistBlock;
  resultPrefix: string;
  site: SiteRecord;
  checkResults: Record<string, CheckResult>;
  setCheckResult: (item: string, result: CheckResult) => void;
}) {
  const { lang, t } = useUi();

  if (block.type === "fields") {
    return (
      <section className="templateBlock">
        <h4>{localizeLabel(block.title, lang)}</h4>
        <div className={`templateGrid ${block.columns === "three" ? "threeCols" : block.columns === "four" ? "fourCols" : ""}`}>
          {block.fields.map((field) => (
            <label className="label" key={`${block.title}-${field.label}`}>
              {localizeLabel(field.label, lang)}
              <input
                className="field"
                defaultValue={resolveFieldValue(field, site)}
                placeholder={localizeLabel(field.placeholder ?? field.label, lang)}
              />
            </label>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "radios") {
    return (
      <section className="templateBlock">
        <div className="radioGroup">
          <strong>{localizeLabel(block.label, lang)}</strong>
          <div>
            {block.items.map((item, index) => (
              <label key={item}>
                <input name={`${resultPrefix}-${block.label}`} type="radio" defaultChecked={index === 0} />
                <span />
                {localizeLabel(item, lang)}
              </label>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "diagTable") {
    return (
      <section className="templateBlock">
        <h4>{localizeLabel(block.title, lang)}</h4>
        <div className="pmDeviceTable">
          <span className="tableHeader">{t("pm.device")}</span>
          {diagColumns.map((column) => (
            <span className="tableHeader" key={column}>{column}</span>
          ))}
          {diagDevices.map((device) => (
            <DiagPmRow
              key={device}
              device={device}
              resultPrefix={`${resultPrefix}:${device}`}
              checkResults={checkResults}
              setCheckResult={setCheckResult}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="templateBlock">
      <h4>{localizeLabel(block.title, lang)}</h4>
      <div className="checkBlockRows">
        {block.items.map((item) => (
          <ChecklistResultRow
            key={item}
            item={item}
            resultKey={`${resultPrefix}:${block.title}:${item}`}
            checkResults={checkResults}
            setCheckResult={setCheckResult}
          />
        ))}
      </div>
    </section>
  );
}

function ChecklistResultRow({
  item,
  resultKey,
  checkResults,
  setCheckResult
}: {
  item: string;
  resultKey: string;
  checkResults: Record<string, CheckResult>;
  setCheckResult: (item: string, result: CheckResult) => void;
}) {
  const { lang, t } = useUi();

  return (
    <div className="checkRow">
      <strong>{localizeLabel(item, lang)}</strong>
      <div className="vx">
        <button
          className={checkResults[resultKey] === "ok" ? "resultDot resultOk" : "resultDot resultChoiceOk"}
          type="button"
          aria-label={`${t("pm.pass")}: ${localizeLabel(item, lang)}`}
          aria-pressed={checkResults[resultKey] === "ok"}
          onClick={() => setCheckResult(resultKey, "ok")}
        >
          <Check size={13} />
        </button>
        <button
          className={checkResults[resultKey] === "bad" ? "resultDot resultBad" : "resultDot resultChoiceBad"}
          type="button"
          aria-label={`${t("pm.fail")}: ${localizeLabel(item, lang)}`}
          aria-pressed={checkResults[resultKey] === "bad"}
          onClick={() => setCheckResult(resultKey, "bad")}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function DiagPmRow({
  device,
  resultPrefix,
  checkResults,
  setCheckResult
}: {
  device: string;
  resultPrefix: string;
  checkResults: Record<string, CheckResult>;
  setCheckResult: (item: string, result: CheckResult) => void;
}) {
  return (
    <>
      <strong className="deviceName">{device}</strong>
      {diagColumns.map((column) => {
        const resultKey = `${resultPrefix}:${column}`;
        const result = checkResults[resultKey];
        return (
          <span className="dotCell" key={column}>
            <button
              className={result === "ok" ? "resultDot resultOk" : result === "bad" ? "resultDot resultBad" : "resultDot"}
              type="button"
              aria-label={`${device} ${column}`}
              aria-pressed={result !== undefined}
              onClick={() => setCheckResult(resultKey, result === "ok" ? "bad" : "ok")}
            >
              {result === "bad" ? <X size={13} /> : <Check size={13} />}
            </button>
          </span>
        );
      })}
    </>
  );
}

function resolveFieldValue(field: ChecklistField, site: SiteRecord) {
  if (field.value !== undefined) {
    return field.value;
  }

  if (field.label === "Customer Name") {
    return site.customer;
  }

  if (field.label === "Location") {
    return site.address;
  }

  return undefined;
}

function buildConfiguredChecklistGroups(config: PmChecklistConfig, lang: Lang): ConfiguredChecklistGroup[] {
  return checklistTabs
    .filter((group) => config.selectedTabs.includes(group.key))
    .map((group) => ({
      ...group,
      sets: Array.from({ length: config.setCounts[group.key] ?? 1 }, (_, index) => (
        buildChecklistSet(group.key, index + 1, config, lang)
      ))
    }));
}

function getSelectedItems(config: PmChecklistConfig, key: PmChecklistKey, items: string[]) {
  const selectedItems = config.selectedItems[key];
  return selectedItems ? items.filter((item) => selectedItems.includes(item)) : items;
}

function hideEmptyChecklistBlocks(blocks: ChecklistBlock[]) {
  return blocks.filter((block) => block.type !== "checks" || block.items.length > 0);
}

function buildChecklistSet(key: PmChecklistKey, setId: number, config: PmChecklistConfig, lang: Lang): ChecklistSet {
  switch (key) {
    case "synapse":
      return {
        title: `SYNAPSE #${setId}`,
        blocks: hideEmptyChecklistBlocks([
          {
            type: "fields",
            title: "CUSTOMER INFORMATION",
            fields: [
              { label: "Customer Name" },
              { label: "Synapse Version" },
              { label: "Host Name" },
              { label: "License Studies" },
              { label: "Current Studies Per Year" },
              { label: "Antivirus Definition Date", placeholder: "DD/MM/YYYY" }
            ]
          },
          {
            type: "fields",
            title: "FREE SPACE (GB)",
            columns: "four",
            fields: [
              { label: "Database O: Free (GB)" },
              { label: "Database O: Total (GB)" },
              { label: "Warm DB Free (GB)" },
              { label: "Warm DB Total (GB)" }
            ]
          },
          { type: "checks", title: "SYNAPSE SYSTEM CHECKLIST", items: getSelectedItems(config, "synapse", synapseSystem) },
          { type: "checks", title: "CONFIGURATION BACKUP CHECKLIST", items: getSelectedItems(config, "synapse", configurationBackup) },
          { type: "fields", title: "CONFIGURATION BACKUP PATH", fields: [{ label: "Configuration Backup Path" }] },
          { type: "radios", label: "Backup Type", items: ["DR Site", "S", "Other"] },
          { type: "fields", title: "BACKUP DEVICE / DATA BACKUP CHECKING", fields: [{ label: "Location" }] },
          { type: "radios", label: "Hardware Status", items: ["ปกติ", "ผิดปกติ"] },
          { type: "radios", label: "Backup Status", items: ["ปกติ", "ผิดปกติ"] },
          { type: "fields", title: "RUNNING DATE", fields: [{ label: "Running Date", placeholder: "DD/MM/YYYY" }] }
        ])
      };
    case "server":
      return {
        title: `SERVER #${setId}`,
        blocks: hideEmptyChecklistBlocks([
          {
            type: "fields",
            title: "SERVER INFORMATION",
            fields: ["Location", "Manufacturer", "Host Name", "Model", "S/N or S/T", "IP Address", "ESX Version", "MT"].map((label) => ({ label }))
          },
          { type: "checks", title: "SERVER CHECKLIST", items: getSelectedItems(config, "server", serverChecklist) }
        ])
      };
    case "switch":
      return {
        title: `SWITCH #${setId}`,
        blocks: hideEmptyChecklistBlocks([
          {
            type: "fields",
            title: "SWITCH INFORMATION",
            fields: ["Customer Name", "Location", "Brand", "Model", "S/N", "Host Name", "IP Address"].map((label) => ({ label }))
          },
          { type: "checks", title: "SWITCH CHECKLIST", items: getSelectedItems(config, "switch", switchChecklist) }
        ])
      };
    case "storage":
      return {
        title: `STORAGE #${setId}`,
        blocks: hideEmptyChecklistBlocks([
          {
            type: "fields",
            title: "STORAGE INFORMATION",
            fields: ["Customer Name", "Location", "Model", "Manufacturer", "S/N or S/T", "MT"].map((label) => ({ label }))
          },
          { type: "checks", title: "STORAGE CHECKLIST", items: getSelectedItems(config, "storage", storageChecklist) }
        ])
      };
    case "environment":
      return {
        title: `ENVIRONMENT #${setId}`,
        blocks: hideEmptyChecklistBlocks([
          {
            type: "fields",
            title: "CUSTOMER INFORMATION",
            fields: [{ label: "Customer Name" }, { label: "Location" }]
          },
          { type: "checks", title: "ENVIRONMENT CHECKLIST: สภาพแวดล้อม", items: getSelectedItems(config, "environment", environmentMain) },
          { type: "checks", title: "ENVIRONMENT CHECKLIST: ระบบสายสัญญาณและระบบไฟฟ้า", items: getSelectedItems(config, "environment", environmentPower) },
          { type: "checks", title: "SECURITY CHECKLIST", items: getSelectedItems(config, "environment", environmentSecurity) }
        ])
      };
    case "diag":
      return {
        title: `${lang === "th" ? "DIAG ชุดที่" : "DIAG set"} #${setId}`,
        blocks: [
          {
            type: "fields",
            title: "DIAG INFORMATION",
            fields: ["Customer Name", "Location", "Brand", "Model", "S/N", "IP Address", "OS"].map((label) => ({ label }))
          },
          { type: "radios", label: "Antivirus", items: ["Installed", "No Installation"] },
          { type: "fields", title: "DEFINITION DATE", fields: [{ label: "Definition Date", placeholder: "DD/MM/YYYY" }] },
          {
            type: "fields",
            title: "Calibrate: Monitor 1",
            columns: "three",
            fields: ["Brand / Model", "S/N", "Target Min (cd/m²)", "Target Max (cd/m²)", "Result Min (cd/m²)", "Result Max (cd/m²)"].map((label) => ({ label }))
          },
          {
            type: "fields",
            title: "Calibrate: Monitor 2",
            columns: "three",
            fields: ["Brand / Model", "S/N", "Target Min (cd/m²)", "Target Max (cd/m²)", "Result Min (cd/m²)", "Result Max (cd/m²)"].map((label) => ({ label }))
          },
          { type: "radios", label: "Diagnostic Monitor / SMPTE Pattern", items: ["ปกติ", "ผิดปกติ"] },
          {
            type: "fields",
            title: "Physical Status",
            columns: "three",
            fields: ["Act. Times Monitor 1", "Act. Times Monitor 2", "Backlight Times Monitor 1", "Backlight Times Monitor 2", "Mfg Date Monitor 1", "Mfg Date Monitor 2"].map((label) => ({
              label,
              placeholder: label.includes("Date") ? "DD/MM/YYYY" : label
            }))
          },
          { type: "diagTable", title: "รายการตรวจสอบอุปกรณ์" }
        ]
      };
  }
}
