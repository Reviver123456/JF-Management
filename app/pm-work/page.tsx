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
import { FeedbackPopups, LoadingPopup } from "@/components/AppPopup";
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
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  filterPmJobsByParticipant,
  getDateString,
  getSiteRecordJobKey,
  getUniquePmJobs,
  getWorkSiteBySiteId,
  getWorkSitesByDate,
  statusMeta,
  type PmWorkDetails,
  type SiteRecord
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

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

function mergePhotoState(value: PmWorkDetails["photos"] | undefined): PhotoState {
  return {
    device: value?.device ?? [],
    overview: value?.overview ?? [],
    issue: value?.issue ?? [],
    part: value?.part ?? []
  };
}

function normalizeSpareParts(value: PmWorkDetails["spareParts"] | undefined): SparePart[] {
  return Array.isArray(value)
    ? value.map((part) => ({
      id: part.id,
      name: part.name,
      quantity: part.quantity,
      note: part.note
    }))
    : [];
}

function trimRecordValues(value: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item.trim().length > 0)
  );
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

function diagKey(resultPrefix: string, device: string, column: string) {
  return `${resultPrefix}:${device}:${column}`;
}

function getMissingRequiredCount({
  checkResults,
  fieldValues,
  finalStatus,
  groups,
  inspector,
  site,
  signerName,
  startTime,
  endTime
}: {
  checkResults: Record<string, CheckResult>;
  fieldValues: Record<string, string>;
  finalStatus: FinalStatus | null;
  groups: ConfiguredChecklistGroup[];
  inspector: string;
  site: SiteRecord;
  signerName: string;
  startTime: string;
  endTime: string;
}) {
  let missingCount = 0;

  if (!startTime.trim()) missingCount += 1;
  if (!endTime.trim()) missingCount += 1;
  if (!inspector.trim()) missingCount += 1;
  if (!signerName.trim()) missingCount += 1;
  if (!finalStatus) missingCount += 1;

  groups.forEach((group) => {
    group.sets.forEach((set) => {
      set.blocks.forEach((block, blockIndex) => {
        const resultPrefix = `${group.key}:${set.title}:${blockIndex}`;

        if (block.type === "fields") {
          block.fields.forEach((field) => {
            const key = fieldKey(group.key, set.title, blockIndex, field.label);
            const value = fieldValues[key] ?? resolveFieldValue(field, site) ?? "";
            if (!value.trim()) {
              missingCount += 1;
            }
          });
        }

        if (block.type === "checks") {
          block.items.forEach((item) => {
            if (!checkResults[checkKey(resultPrefix, block.title, item)]) {
              missingCount += 1;
            }
          });
        }

        if (block.type === "diagTable") {
          diagDevices.forEach((device) => {
            diagColumns.forEach((column) => {
              if (!checkResults[diagKey(resultPrefix, device, column)]) {
                missingCount += 1;
              }
            });
          });
        }
      });
    });
  });

  return missingCount;
}

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
      <LoadingPopup open message={t("pm.loadingSubtitle")} />
      <div className="pmWorkPage">
        <PageTitle title={t("pm.title")} subtitle={t("pm.loadingSubtitle")} />
      </div>
    </AppShell>
  );
}

function PmWorkContent() {
  const { t } = useUi();
  const { data, error, isLoading, reload } = usePmData();
  const { error: userError, isLoading: isUserLoading, userName } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteIdParam = searchParams.get("siteId");
  const todayDate = useMemo(() => getDateString(), []);
  const visibleSites = useMemo(() => {
    const visibleJobs = getUniquePmJobs(filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, userName));
    const visibleJobKeys = new Set(visibleJobs.map((job) => `${job.siteId}:${job.visitDate}:${job.visitTime}`));

    return data.sites.filter((site) => visibleJobKeys.has(getSiteRecordJobKey(site)));
  }, [data.pmJobs, data.siteCatalog, data.sites, userName]);

  const [activeTab, setActiveTab] = useState<PmChecklistKey>("synapse");

  const selectedSite = useMemo(
    () => siteIdParam ? getWorkSiteBySiteId(visibleSites, siteIdParam) : null,
    [visibleSites, siteIdParam]
  );

  const openSite = (site: SiteRecord) => {
    router.push(`/pm-work?siteId=${encodeURIComponent(site.id)}`);
  };

  const closeDetail = () => {
    router.push("/pm-work");
  };

  const filteredSites = useMemo(() => getWorkSitesByDate(visibleSites, todayDate), [visibleSites, todayDate]);
  const pageIsLoading = isLoading || isUserLoading;

  return (
    <AppShell>
      <div className="pmWorkPage">
        <FeedbackPopups
          loading={pageIsLoading}
          loadingMessage={t("pm.loadingSubtitle")}
          alertMessage={error ?? userError}
        />
        {selectedSite ? (
          <DetailView key={selectedSite.jobId} site={selectedSite} activeTab={activeTab} setActiveTab={setActiveTab} onBack={closeDetail} onSaved={reload} />
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
  onBack,
  onSaved
}: {
  site: SiteRecord;
  activeTab: PmChecklistKey;
  setActiveTab: (value: PmChecklistKey) => void;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const { lang, t } = useUi();
  const status = statusMeta[site.status];
  const savedDetails = site.workDetails;
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>(savedDetails?.checkResults ?? {});
  const [checkNotes, setCheckNotes] = useState<Record<string, string>>(savedDetails?.checkNotes ?? {});
  const [checklistConfig, setChecklistConfig] = useState<PmChecklistConfig>(() => readSitePmChecklistConfig(site.id));
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(savedDetails?.fieldValues ?? {});
  const [radioValues, setRadioValues] = useState<Record<string, string>>(savedDetails?.radioValues ?? {});
  const [photos, setPhotos] = useState<PhotoState>(() => mergePhotoState(savedDetails?.photos));
  const [spareParts, setSpareParts] = useState<SparePart[]>(() => normalizeSpareParts(savedDetails?.spareParts));
  const [startTime, setStartTime] = useState(savedDetails?.startTime ?? site.startTime ?? site.visitTime);
  const [endTime, setEndTime] = useState(savedDetails?.endTime ?? site.endTime ?? "");
  const [inspector, setInspector] = useState(savedDetails?.inspector ?? site.owner);
  const [finalStatus, setFinalStatus] = useState<FinalStatus | null>(() => {
    if (savedDetails?.finalStatus) {
      return savedDetails.finalStatus;
    }

    if (site.status === "completed") {
      return "normal";
    }

    if (site.status === "abnormal") {
      return "abnormal";
    }

    return null;
  });
  const [summaryNote, setSummaryNote] = useState(savedDetails?.summaryNote ?? "");
  const [signerName, setSignerName] = useState(savedDetails?.signerName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const configuredGroups = useMemo(() => buildConfiguredChecklistGroups(checklistConfig, lang), [checklistConfig, lang]);
  const group = configuredGroups.find((item) => item.key === activeTab) ?? configuredGroups[0];
  const missingRequiredCount = useMemo(() => getMissingRequiredCount({
    checkResults,
    fieldValues,
    finalStatus,
    groups: configuredGroups,
    inspector,
    site,
    signerName,
    startTime,
    endTime
  }), [checkResults, configuredGroups, endTime, fieldValues, finalStatus, inspector, signerName, site, startTime]);
  const canSubmit = missingRequiredCount === 0;
  const draftSuccessMessage = lang === "th" ? "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e23\u0e48\u0e32\u0e07\u0e41\u0e25\u0e49\u0e27" : "Draft saved.";
  const requiredMessage = lang === "th"
    ? `\u0e22\u0e31\u0e07\u0e02\u0e32\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25 ${missingRequiredCount} \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23`
    : `${missingRequiredCount} required items remaining`;
  const saveSuccessMessage = lang === "th" ? "บันทึกข้อมูลงาน PM แล้ว" : "PM job saved.";

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
  const setCheckNote = (item: string, value: string) => {
    setCheckNotes((current) => ({
      ...current,
      [item]: value
    }));
  };
  const setFieldValue = (item: string, value: string) => {
    setFieldValues((current) => ({
      ...current,
      [item]: value
    }));
  };
  const setRadioValue = (item: string, value: string) => {
    setRadioValues((current) => ({
      ...current,
      [item]: value
    }));
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
  const buildWorkDetails = (draftStatus: PmWorkDetails["draftStatus"]): PmWorkDetails => ({
    checkNotes: trimRecordValues(checkNotes),
    checkResults,
    checklistSnapshot: configuredGroups,
    draftStatus,
    fieldValues: trimRecordValues(fieldValues),
    finalStatus,
    inspector,
    photos,
    radioValues: trimRecordValues(radioValues),
    savedAt: new Date().toISOString(),
    signerName,
    spareParts,
    startTime,
    endTime,
    summaryNote
  });
  const saveWork = async (mode: "draft" | "submit") => {
    setSaveError("");
    setSaveSuccess("");

    if (mode === "submit" && !canSubmit) {
      setSaveError(requiredMessage);
      return;
    }

    const nextStatus = mode === "draft"
      ? "inProgress"
      : finalStatus === "abnormal" ? "abnormal" : "completed";
    const nextResult = mode === "draft"
      ? null
      : finalStatus === "abnormal" ? "ผิดปกติ" : "ปกติ";

    setIsSaving(true);

    try {
      const response = await fetch(`/api/pm-jobs/${encodeURIComponent(site.jobId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          details: buildWorkDetails(mode === "draft" ? "draft" : "submitted"),
          status: nextStatus,
          startTime,
          endTime,
          result: nextResult
        })
      });
      const payload = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Cannot save PM job.");
      }

      await onSaved();
      setSaveSuccess(mode === "draft" ? draftSuccessMessage : saveSuccessMessage);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Cannot save PM job.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="detailPage">
      <FeedbackPopups
        loading={isSaving}
        loadingMessage={t("pm.loadingSubtitle")}
        alertMessage={saveError || saveSuccess}
        alertTone={saveSuccess ? "success" : "error"}
      />
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
            <input className="field" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label className="label">
            {t("fields.endTime")}
            <input className="field" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label className="label">
            {t("common.inspector")}
            <input className="field" value={inspector} onChange={(event) => setInspector(event.target.value)} />
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
                    blockIndex={blockIndex}
                    groupKey={group.key}
                    resultPrefix={`${group.key}:${set.title}:${blockIndex}`}
                    setTitle={set.title}
                    site={site}
                    fieldValues={fieldValues}
                    setFieldValue={setFieldValue}
                    radioValues={radioValues}
                    setRadioValue={setRadioValue}
                    checkResults={checkResults}
                    setCheckResult={setCheckResult}
                    checkNotes={checkNotes}
                    setCheckNote={setCheckNote}
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
              capture={item.key === "device" || item.key === "overview"}
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
        {!canSubmit ? <span className="requiredHint">{requiredMessage}</span> : null}
        <button className="button ghost" type="button" onClick={onBack}>{t("common.back")}</button>
        <button className="button subtle" type="button" onClick={() => saveWork("draft")} disabled={isSaving}>{t("common.saveDraft")}</button>
        <button className="button primary" type="button" onClick={() => saveWork("submit")} disabled={isSaving || !canSubmit}>
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
  capture = false,
  label,
  fileNames,
  onChange
}: {
  capture?: boolean;
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
        capture={capture ? "environment" : undefined}
        multiple={!capture}
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
  blockIndex,
  groupKey,
  resultPrefix,
  setTitle,
  site,
  fieldValues,
  setFieldValue,
  radioValues,
  setRadioValue,
  checkResults,
  setCheckResult,
  checkNotes,
  setCheckNote
}: {
  block: ChecklistBlock;
  blockIndex: number;
  groupKey: PmChecklistKey;
  resultPrefix: string;
  setTitle: string;
  site: SiteRecord;
  fieldValues: Record<string, string>;
  setFieldValue: (item: string, value: string) => void;
  radioValues: Record<string, string>;
  setRadioValue: (item: string, value: string) => void;
  checkResults: Record<string, CheckResult>;
  setCheckResult: (item: string, result: CheckResult) => void;
  checkNotes: Record<string, string>;
  setCheckNote: (item: string, value: string) => void;
}) {
  const { lang, t } = useUi();

  if (block.type === "fields") {
    return (
      <section className="templateBlock">
        <h4>{localizeLabel(block.title, lang)}</h4>
        <div className={`templateGrid ${block.columns === "three" ? "threeCols" : block.columns === "four" ? "fourCols" : ""}`}>
          {block.fields.map((field) => {
            const key = fieldKey(groupKey, setTitle, blockIndex, field.label);
            const value = fieldValues[key] ?? resolveFieldValue(field, site) ?? "";

            return (
              <label className="label" key={`${block.title}-${field.label}`}>
                {localizeLabel(field.label, lang)}
                <input
                  className="field"
                  value={value}
                  placeholder={localizeLabel(field.placeholder ?? field.label, lang)}
                  onChange={(event) => setFieldValue(key, event.target.value)}
                />
              </label>
            );
          })}
        </div>
      </section>
    );
  }

  if (block.type === "radios") {
    const key = radioKey(groupKey, setTitle, blockIndex, block.label);
    const selectedValue = radioValues[key] ?? block.items[0] ?? "";

    return (
      <section className="templateBlock">
        <div className="radioGroup">
          <strong>{localizeLabel(block.label, lang)}</strong>
          <div>
            {block.items.map((item) => (
              <label key={item}>
                <input
                  name={`${resultPrefix}-${block.label}`}
                  type="radio"
                  checked={selectedValue === item}
                  onChange={() => setRadioValue(key, item)}
                />
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
    const selectedDiagKeys = diagDevices.flatMap((device) => (
      diagColumns
        .map((column) => ({
          key: diagKey(resultPrefix, device, column),
          label: `${device} ${column}`
        }))
        .filter((item) => checkResults[item.key])
    ));

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
        {selectedDiagKeys.length > 0 ? (
          <div className="checkNotesGrid">
            {selectedDiagKeys.map((item) => (
              <label className="label" key={item.key}>
                {t("common.note")}: {item.label}
                <textarea
                  className="textarea compactTextarea"
                  value={checkNotes[item.key] ?? ""}
                  onChange={(event) => setCheckNote(item.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        ) : null}
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
            resultKey={checkKey(resultPrefix, block.title, item)}
            checkResults={checkResults}
            setCheckResult={setCheckResult}
            checkNotes={checkNotes}
            setCheckNote={setCheckNote}
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
  setCheckResult,
  checkNotes,
  setCheckNote
}: {
  item: string;
  resultKey: string;
  checkResults: Record<string, CheckResult>;
  setCheckResult: (item: string, result: CheckResult) => void;
  checkNotes: Record<string, string>;
  setCheckNote: (item: string, value: string) => void;
}) {
  const { lang, t } = useUi();
  const result = checkResults[resultKey];

  return (
    <div className="checkRow">
      <strong>{localizeLabel(item, lang)}</strong>
      <div className="vx">
        <button
          className={result === "ok" ? "resultDot resultOk" : "resultDot resultChoiceOk"}
          type="button"
          aria-label={`${t("pm.pass")}: ${localizeLabel(item, lang)}`}
          aria-pressed={result === "ok"}
          onClick={() => setCheckResult(resultKey, "ok")}
        >
          <Check size={13} />
        </button>
        <button
          className={result === "bad" ? "resultDot resultBad" : "resultDot resultChoiceBad"}
          type="button"
          aria-label={`${t("pm.fail")}: ${localizeLabel(item, lang)}`}
          aria-pressed={result === "bad"}
          onClick={() => setCheckResult(resultKey, "bad")}
        >
          <X size={13} />
        </button>
      </div>
      {result ? (
        <label className="label checkNoteField">
          {t("common.note")}
          <textarea
            className="textarea compactTextarea"
            value={checkNotes[resultKey] ?? ""}
            onChange={(event) => setCheckNote(resultKey, event.target.value)}
          />
        </label>
      ) : null}
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

function getSelectedItems(config: PmChecklistConfig, key: PmChecklistKey, items: string[], includeCustomItems = false) {
  const selectedItems = config.selectedItems[key];
  const configuredItems = selectedItems ? items.filter((item) => selectedItems.includes(item)) : items;

  return includeCustomItems ? [...configuredItems, ...(config.customItems[key] ?? [])] : configuredItems;
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
          { type: "checks", title: "SYNAPSE SYSTEM CHECKLIST", items: getSelectedItems(config, "synapse", synapseSystem, true) },
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
          { type: "checks", title: "SERVER CHECKLIST", items: getSelectedItems(config, "server", serverChecklist, true) }
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
          { type: "checks", title: "SWITCH CHECKLIST", items: getSelectedItems(config, "switch", switchChecklist, true) }
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
          { type: "checks", title: "STORAGE CHECKLIST", items: getSelectedItems(config, "storage", storageChecklist, true) }
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
          { type: "checks", title: "ENVIRONMENT CHECKLIST: สภาพแวดล้อม", items: getSelectedItems(config, "environment", environmentMain, true) },
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
