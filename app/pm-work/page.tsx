"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  ReceiptText,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { AppSelect } from "@/components/AppSelect";
import { TimePicker } from "@/components/TimePicker";
import { FormDateInput } from "@/components/FormDateInput";
import { FeedbackPopups } from "@/components/AppPopup";
import type { SystemUser } from "@/lib/auth/system-users";
import { useUi, type Lang } from "@/lib/i18n";
import { localizeLabel } from "@/lib/localize-label";
import {
  readSiteContractChecklistConfig,
  type PmChecklistConfig,
  type PmChecklistKey
} from "@/lib/pm-checklist-config";
import { getPmOrderNoFromWorkDetails } from "@/lib/pm-order-no";
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
  emptyPmContractChecklistData,
  filterPmJobsByParticipant,
  getContractCount,
  getDateString,
  getPmContractChecklistData,
  getSiteContractAt,
  getSiteContractItems,
  getSiteContractLabel,
  getSiteContractVisitTotal,
  getSiteRecordJobKey,
  getUniquePmJobs,
  getVisitRoundForJob,
  getWorkSiteByJobId,
  getWorkSiteBySiteId,
  getWorkSitesByDate,
  statusMeta,
  type PmContractChecklistData,
  type PmExpenseDetails,
  type PmJobRecord,
  type PmWorkDetails,
  type SiteRecord
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { isAllOwners, resolveActiveOwner } from "@/lib/owner-filter";
import { isDateLikeField } from "@/lib/date-input";
import { formatDecimalInputValue, isDecimalLikeField } from "@/lib/decimal-input";
import {
  mergePhotoState,
  readPhotoFiles,
  serializePhotoState,
  type PhotoCategory,
  type PhotoState
} from "@/lib/pm-photos";

type CheckResult = "ok" | "bad";
type FinalStatus = "normal" | "abnormal";
type PhotoKey = PhotoCategory;
type PhotoNotes = Partial<Record<PhotoKey, string>>;
type ExpenseKey = keyof Required<PmExpenseDetails>;
type SparePart = {
  id: number;
  name: string;
  quantity: string;
  note: string;
};
type ChecklistField = {
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "decimal";
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
const emptyExpenses: Required<PmExpenseDetails> = {
  carRental: "",
  fuel: "",
  general: "",
  lodging: "",
  other: "",
  toll: ""
};
const expenseFields: { key: ExpenseKey; labelKey: string }[] = [
  { key: "general", labelKey: "pm.generalExpense" },
  { key: "lodging", labelKey: "pm.lodgingExpense" },
  { key: "carRental", labelKey: "pm.carRentalExpense" },
  { key: "fuel", labelKey: "pm.fuelExpense" },
  { key: "toll", labelKey: "pm.tollExpense" },
  { key: "other", labelKey: "pm.otherExpense" }
];

function mergePhotoNotes(value: PmWorkDetails["photoNotes"] | undefined): PhotoNotes {
  return {
    device: value?.device ?? "",
    overview: value?.overview ?? "",
    issue: value?.issue ?? "",
    part: value?.part ?? ""
  };
}

function trimPhotoNotes(value: PhotoNotes): PhotoNotes {
  return Object.entries(value).reduce<PhotoNotes>((notes, [key, item]) => {
    if (item?.trim()) {
      notes[key as PhotoKey] = item.trim();
    }

    return notes;
  }, {});
}

function normalizeExpenses(value: PmWorkDetails["expenses"] | undefined): Required<PmExpenseDetails> {
  return {
    ...emptyExpenses,
    ...(value ?? {})
  };
}

function trimExpenses(value: Required<PmExpenseDetails>): PmExpenseDetails {
  return Object.entries(value).reduce<PmExpenseDetails>((details, [key, item]) => {
    if (item.trim()) {
      details[key as ExpenseKey] = item.trim();
    }

    return details;
  }, {});
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

function isDiagCalibrateFieldsBlock(groupKey: string, block: ChecklistBlock) {
  return groupKey === "diag" && block.type === "fields" && block.title.toLowerCase().startsWith("calibrate: monitor");
}

function diagCalibrateStatusKey(groupKey: string, setTitle: string, blockIndex: number, title: string) {
  return `${groupKey}:calibrate-status:${setTitle}:${blockIndex}:${title}`;
}

function readChecklistConfigForSite(site: SiteRecord, contractIndex = 0): PmChecklistConfig {
  return readSiteContractChecklistConfig(site, contractIndex);
}

type ContractChecklistDraft = ReturnType<typeof emptyPmContractChecklistData>;

function hydrateChecklistByContract(savedDetails: PmWorkDetails | undefined, contractCount: number) {
  const result: Record<number, ContractChecklistDraft> = {};

  for (let index = 0; index < contractCount; index += 1) {
    result[index] = getPmContractChecklistData(savedDetails, index);
  }

  return result;
}

function buildChecklistByContractPayload({
  checklistByContract,
  configuredGroups,
  contractCount,
  lang,
  selectedContractIndex,
  site
}: {
  checklistByContract: Record<number, ContractChecklistDraft>;
  configuredGroups: ConfiguredChecklistGroup[];
  contractCount: number;
  lang: "th" | "en";
  selectedContractIndex: number;
  site: SiteRecord;
}) {
  const payload: Record<string, PmContractChecklistData> = {};

  for (let index = 0; index < contractCount; index += 1) {
    const draft = checklistByContract[index] ?? emptyPmContractChecklistData();
    const checklistSnapshot = index === selectedContractIndex
      ? configuredGroups
      : (draft.checklistSnapshot.length > 0
        ? draft.checklistSnapshot
        : buildConfiguredChecklistGroups(readChecklistConfigForSite(site, index), lang));

    payload[String(index)] = {
      checkNotes: trimRecordValues(draft.checkNotes),
      checkResults: draft.checkResults,
      fieldValues: trimRecordValues(draft.fieldValues),
      radioValues: trimRecordValues(draft.radioValues),
      checklistSnapshot
    };
  }

  return payload;
}

function getMissingRequiredCount({
  fieldValues,
  finalStatus,
  groups,
  inspector,
  site,
  signerName,
  startTime,
  endTime
}: {
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
        if (block.type === "fields") {
          block.fields.forEach((field) => {
            const key = fieldKey(group.key, set.title, blockIndex, field.label);
            const value = fieldValues[key] ?? resolveFieldValue(field, site) ?? "";
            if (!value.trim()) {
              missingCount += 1;
            }
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
      <div className="pmWorkPage">
        <PageTitle title={t("pm.title")} subtitle={t("pm.listSubtitle")} />
      </div>
    </AppShell>
  );
}

function PmWorkContent() {
  const { t } = useUi();
  const { data, error, reload } = usePmData();
  const { error: userError, userName, signature: userSignature } = useCurrentUser();
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteIdParam = searchParams.get("siteId");
  const jobIdParam = searchParams.get("jobId");
  const ownerParam = searchParams.get("owner") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const viewParam = searchParams.get("view") ?? "";
  const showAllJobs = viewParam === "all";
  const todayDate = useMemo(() => getDateString(), []);
  const visibleSites = useMemo(() => {
    const activeOwner = resolveActiveOwner({ ownerParam, userName });
    const visibleJobs = getUniquePmJobs(isAllOwners(activeOwner)
      ? data.pmJobs
      : filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, activeOwner));
    const visibleJobKeys = new Set(visibleJobs.map((job) => `${job.siteId}:${job.visitDate}:${job.visitTime}`));

    return data.sites.filter((site) => visibleJobKeys.has(getSiteRecordJobKey(site)));
  }, [data.pmJobs, data.siteCatalog, data.sites, ownerParam, userName]);

  const [activeTab, setActiveTab] = useState<PmChecklistKey>("synapse");

  useEffect(() => {
    let isCurrent = true;

    async function loadSystemUsers() {
      try {
        const response = await fetch("/api/auth/users", { cache: "no-store" });
        const payload = await response.json() as { users?: SystemUser[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Cannot load users.");
        }

        if (isCurrent) {
          setSystemUsers(payload.users ?? []);
          setUsersError("");
        }
      } catch (loadError) {
        if (isCurrent) {
          setUsersError(loadError instanceof Error ? loadError.message : "Cannot load users.");
        }
      }
    }

    loadSystemUsers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedSite = useMemo(
    () => {
      if (jobIdParam) {
        const siteByJobId = getWorkSiteByJobId(visibleSites, jobIdParam);

        if (siteByJobId) {
          return siteByJobId;
        }

        const sourceJob = data.pmJobs.find((job) => job.id === jobIdParam);
        return sourceJob
          ? visibleSites.find((site) => site.id === sourceJob.siteId && site.visitDate === sourceJob.visitDate && site.visitTime === sourceJob.visitTime) ?? null
          : null;
      }

      return siteIdParam ? getWorkSiteBySiteId(visibleSites, siteIdParam) : null;
    },
    [data.pmJobs, jobIdParam, visibleSites, siteIdParam]
  );

  const listQuery = showAllJobs
    ? `view=all${statusParam ? `&status=${encodeURIComponent(statusParam)}` : ""}${ownerParam ? `&owner=${encodeURIComponent(ownerParam)}` : ""}`
    : "";

  const openSite = (site: SiteRecord) => {
    router.push(`/pm-work?jobId=${encodeURIComponent(site.jobId)}${listQuery ? `&${listQuery}` : ""}`);
  };

  const closeDetail = () => {
    router.push(listQuery ? `/pm-work?${listQuery}` : "/pm-work");
  };

  const filteredSites = useMemo(() => {
    const sourceSites = showAllJobs ? visibleSites : getWorkSitesByDate(visibleSites, todayDate);

    if (statusParam === "backlog") {
      return sourceSites.filter((site) => site.status === "pending" || site.status === "inProgress");
    }

    if (statusParam === "completed" || statusParam === "abnormal" || statusParam === "pending" || statusParam === "inProgress") {
      return sourceSites.filter((site) => site.status === statusParam);
    }

    return sourceSites;
  }, [showAllJobs, statusParam, todayDate, visibleSites]);
  const listSubtitle = showAllJobs
    ? `${statusParam === "backlog" ? t("dashboard.backlog") : t("pm.title")} · ${filteredSites.length} ${t("common.jobs")}`
    : `${t("pm.todayOnlySubtitle")} · ${todayDate}`;
  const isClient = useIsClient();
  const pendingDetail = Boolean(jobIdParam || siteIdParam);
  const showDetailView = isClient && Boolean(selectedSite);

  return (
    <AppShell>
      <div className="pmWorkPage">
        <FeedbackPopups
          alertMessage={error ?? userError ?? usersError}
        />
        {showDetailView && selectedSite ? (
          <DetailView
            key={selectedSite.jobId}
            site={selectedSite}
            pmJobs={data.pmJobs}
            systemUsers={systemUsers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userSignature={userSignature}
            onBack={closeDetail}
            onSaved={reload}
          />
        ) : (
          <>
            <PageTitle title={t("pm.title")} subtitle={listSubtitle} />
            <section className="list">
              {filteredSites.length > 0 ? filteredSites.map((site) => {
                const status = statusMeta[site.status];
                return (
                  <button className="listRow" key={site.jobId} type="button" onClick={() => openSite(site)}>
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
              }) : <p className="emptyState">{showAllJobs ? t("pm.noMatchingJobs") : t("pm.noTodayJobs")}</p>}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function DetailView({
  site,
  pmJobs,
  systemUsers,
  activeTab,
  setActiveTab,
  userSignature,
  onBack,
  onSaved
}: {
  site: SiteRecord;
  pmJobs: PmJobRecord[];
  systemUsers: SystemUser[];
  activeTab: PmChecklistKey;
  setActiveTab: (value: PmChecklistKey) => void;
  userSignature: string;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const { lang, t } = useUi();
  const status = statusMeta[site.status];
  const savedDetails = site.workDetails;
  const pmOrderNo = getPmOrderNoFromWorkDetails(savedDetails);
  const contractCount = getContractCount(site.contractDetails);
  const contractItems = useMemo(() => getSiteContractItems(site), [site]);
  const [selectedContractIndex, setSelectedContractIndex] = useState(() => {
    const savedIndex = savedDetails?.contractIndex ?? 0;
    return Math.min(Math.max(savedIndex, 0), Math.max(contractCount - 1, 0));
  });
  const selectedContract = getSiteContractAt(site, selectedContractIndex);
  const [checklistByContract, setChecklistByContract] = useState<Record<number, ContractChecklistDraft>>(
    () => hydrateChecklistByContract(savedDetails, contractCount)
  );
  const activeChecklist = checklistByContract[selectedContractIndex] ?? emptyPmContractChecklistData();
  const checkResults = activeChecklist.checkResults;
  const checkNotes = activeChecklist.checkNotes;
  const fieldValues = activeChecklist.fieldValues;
  const radioValues = activeChecklist.radioValues;
  const [activeCheckNoteKey, setActiveCheckNoteKey] = useState("");
  const [checklistConfig, setChecklistConfig] = useState<PmChecklistConfig>(() => readChecklistConfigForSite(site, selectedContractIndex));
  const [photos, setPhotos] = useState<PhotoState>(() => mergePhotoState(savedDetails?.photos));
  const [photoNotes, setPhotoNotes] = useState<PhotoNotes>(() => mergePhotoNotes(savedDetails?.photoNotes));
  const [photoPopupOpen, setPhotoPopupOpen] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [spareParts, setSpareParts] = useState<SparePart[]>(() => normalizeSpareParts(savedDetails?.spareParts));
  const [expenses, setExpenses] = useState<Required<PmExpenseDetails>>(() => normalizeExpenses(savedDetails?.expenses));
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
  const inspectorSignature = savedDetails?.inspectorSignature ?? "";
  const [customerSignature, setCustomerSignature] = useState(savedDetails?.customerSignature ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosavePromiseRef = useRef<Promise<void> | null>(null);
  const inspectorExists = systemUsers.some((user) => user.name === inspector);
  const visitRound = getVisitRoundForJob(pmJobs, site.id, site.jobId, site.visitDate, site.visitTime);
  const visitTotal = getSiteContractVisitTotal(site, selectedContractIndex, site.pmCycle);
  const displayPmCycle = selectedContract.pmCycle ?? site.pmCycle;
  const configuredGroups = useMemo(() => buildConfiguredChecklistGroups(checklistConfig, lang), [checklistConfig, lang]);
  const group = configuredGroups.find((item) => item.key === activeTab) ?? configuredGroups[0];
  const missingRequiredCount = useMemo(() => getMissingRequiredCount({
    fieldValues,
    finalStatus,
    groups: configuredGroups,
    inspector,
    site,
    signerName,
    startTime,
    endTime
  }), [configuredGroups, endTime, fieldValues, finalStatus, inspector, signerName, site, startTime]);
  const canSubmit = missingRequiredCount === 0;
  const requiredMessage = lang === "th"
    ? `\u0e22\u0e31\u0e07\u0e02\u0e32\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25 ${missingRequiredCount} \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23`
    : `${missingRequiredCount} required items remaining`;
  const saveSuccessMessage = lang === "th" ? "บันทึกข้อมูลงาน PM แล้ว" : "PM job saved.";

  useEffect(() => {
    const refreshConfig = () => setChecklistConfig(readChecklistConfigForSite(site, selectedContractIndex));

    refreshConfig();
    window.addEventListener("focus", refreshConfig);
    window.addEventListener("storage", refreshConfig);
    return () => {
      window.removeEventListener("focus", refreshConfig);
      window.removeEventListener("storage", refreshConfig);
    };
  }, [selectedContractIndex, site]);

  const selectContractIndex = (nextIndex: number) => {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), contractCount - 1);

    if (boundedIndex === selectedContractIndex) {
      return;
    }

    setChecklistByContract((current) => ({
      ...current,
      [selectedContractIndex]: {
        ...(current[selectedContractIndex] ?? emptyPmContractChecklistData()),
        checklistSnapshot: configuredGroups
      }
    }));
    setSelectedContractIndex(boundedIndex);
    setChecklistConfig(readChecklistConfigForSite(site, boundedIndex));
  };

  const patchActiveChecklist = useCallback((
    updater: (current: ContractChecklistDraft) => ContractChecklistDraft
  ) => {
    setChecklistByContract((current) => ({
      ...current,
      [selectedContractIndex]: updater(current[selectedContractIndex] ?? emptyPmContractChecklistData())
    }));
  }, [selectedContractIndex]);

  useEffect(() => {
    if (configuredGroups.length > 0 && !configuredGroups.some((item) => item.key === activeTab)) {
      setActiveTab(configuredGroups[0].key);
    }
  }, [activeTab, configuredGroups, setActiveTab]);

  const setCheckResult = (item: string, result: CheckResult) => {
    patchActiveChecklist((current) => {
      const nextResults = { ...current.checkResults };

      if (nextResults[item] === result) {
        delete nextResults[item];
      } else {
        nextResults[item] = result;
      }

      return { ...current, checkResults: nextResults };
    });
  };
  const setCheckNote = (item: string, value: string) => {
    patchActiveChecklist((current) => ({
      ...current,
      checkNotes: {
        ...current.checkNotes,
        [item]: value
      }
    }));
  };
  const setFieldValue = (item: string, value: string) => {
    patchActiveChecklist((current) => ({
      ...current,
      fieldValues: {
        ...current.fieldValues,
        [item]: value
      }
    }));
  };
  const setRadioValue = (item: string, value: string) => {
    patchActiveChecklist((current) => ({
      ...current,
      radioValues: {
        ...current.radioValues,
        [item]: value
      }
    }));
  };
  const addPhotoFiles = async (key: PhotoKey, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setIsUploadingPhotos(true);
    setPhotoUploadError("");

    try {
      const nextPhotos = await readPhotoFiles(fileList);

      if (nextPhotos.length === 0) {
        setPhotoUploadError(lang === "th" ? "ไม่พบไฟล์รูปภาพที่รองรับ" : "No supported image files found.");
        return;
      }

      setPhotos((current) => ({
        ...current,
        [key]: [...current[key], ...nextPhotos]
      }));
    } catch {
      setPhotoUploadError(lang === "th" ? "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่" : "Photo upload failed. Please try again.");
    } finally {
      setIsUploadingPhotos(false);
    }
  };
  const removePhoto = (key: PhotoKey, photoId: string) => {
    setPhotos((current) => ({
      ...current,
      [key]: current[key].filter((photo) => photo.id !== photoId)
    }));
  };
  const setPhotoNote = (key: PhotoKey, value: string) => {
    setPhotoNotes((current) => ({
      ...current,
      [key]: value
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
  const updateExpense = (key: ExpenseKey, value: string) => {
    setExpenses((current) => ({ ...current, [key]: value }));
  };
  const workDetailsSnapshot = useMemo(() => {
    const checklistByContractPayload = buildChecklistByContractPayload({
      checklistByContract,
      configuredGroups,
      contractCount,
      lang,
      selectedContractIndex,
      site
    });
    const activeContractData = checklistByContractPayload[String(selectedContractIndex)] ?? emptyPmContractChecklistData();

    return {
      checkNotes: activeContractData.checkNotes,
      checkResults: activeContractData.checkResults,
      checklistByContract: checklistByContractPayload,
      checklistSnapshot: activeContractData.checklistSnapshot,
      contractIndex: selectedContractIndex,
      customerSignature,
      expenses: trimExpenses(expenses),
      fieldValues: activeContractData.fieldValues,
      finalStatus,
      inspector,
      inspectorSignature: inspectorSignature || userSignature,
      ...(pmOrderNo ? { pmOrderNo } : {}),
      photoNotes: trimPhotoNotes(photoNotes),
      photos: serializePhotoState(photos),
      radioValues: activeContractData.radioValues,
      signerName,
      spareParts,
      startTime,
      endTime,
      summaryNote
    };
  }, [
    checklistByContract,
    configuredGroups,
    contractCount,
    customerSignature,
    endTime,
    expenses,
    inspector,
    inspectorSignature,
    lang,
    photoNotes,
    photos,
    pmOrderNo,
    selectedContractIndex,
    signerName,
    site,
    spareParts,
    startTime,
    summaryNote,
    userSignature
  ]);
  const draftFingerprint = useMemo(() => JSON.stringify(workDetailsSnapshot), [workDetailsSnapshot]);
  const lastSavedDraftRef = useRef(draftFingerprint);
  const buildWorkDetails = useCallback((draftStatus: PmWorkDetails["draftStatus"]): PmWorkDetails => ({
    ...workDetailsSnapshot,
    draftStatus,
    savedAt: new Date().toISOString()
  }), [workDetailsSnapshot]);
  const latestDraftRef = useRef({
    details: buildWorkDetails("draft"),
    fingerprint: draftFingerprint
  });

  useEffect(() => {
    latestDraftRef.current = {
      details: buildWorkDetails("draft"),
      fingerprint: draftFingerprint
    };
  }, [buildWorkDetails, draftFingerprint]);
  const persistDraft = useCallback((fingerprint: string, details: PmWorkDetails) => {
    const previousSave = autosavePromiseRef.current ?? Promise.resolve();
    const nextSave = previousSave
      .catch(() => undefined)
      .then(async () => {
        setAutosaveState("saving");

        const response = await fetch(`/api/pm-jobs/${encodeURIComponent(site.jobId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            details,
            status: "inProgress",
            startTime: details.startTime ?? "",
            endTime: details.endTime ?? "",
            result: null
          })
        });
        const payload = await response.json() as { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Cannot autosave PM job.");
        }

        lastSavedDraftRef.current = fingerprint;
        setAutosaveState("saved");
      })
      .catch((error) => {
        setAutosaveState("error");
        throw error;
      });

    autosavePromiseRef.current = nextSave;
    return nextSave;
  }, [site.jobId]);

  useEffect(() => {
    if (draftFingerprint === lastSavedDraftRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      autosaveTimeoutRef.current = null;
      void persistDraft(draftFingerprint, buildWorkDetails("draft")).catch(() => undefined);
    }, 1000);
    autosaveTimeoutRef.current = timeout;

    return () => {
      clearTimeout(timeout);
      if (autosaveTimeoutRef.current === timeout) {
        autosaveTimeoutRef.current = null;
      }
    };
  }, [buildWorkDetails, draftFingerprint, persistDraft]);

  useEffect(() => () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    const latestDraft = latestDraftRef.current;

    if (latestDraft.fingerprint === lastSavedDraftRef.current) {
      return;
    }

    void fetch(`/api/pm-jobs/${encodeURIComponent(site.jobId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        details: latestDraft.details,
        status: "inProgress",
        startTime: latestDraft.details.startTime ?? "",
        endTime: latestDraft.details.endTime ?? "",
        result: null
      }),
      keepalive: true
    });
  }, [site.jobId]);

  const flushAutosave = useCallback(async () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    if (draftFingerprint !== lastSavedDraftRef.current) {
      await persistDraft(draftFingerprint, buildWorkDetails("draft"));
      return;
    }

    await autosavePromiseRef.current;
  }, [buildWorkDetails, draftFingerprint, persistDraft]);

  const handleBack = async () => {
    try {
      await flushAutosave();
      await onSaved();
      onBack();
    } catch {
      // Keep the form open when autosave fails so the user can retry.
    }
  };

  const saveWork = async () => {
    setSaveError("");
    setSaveSuccess("");

    if (!canSubmit) {
      setSaveError(requiredMessage);
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    setIsSaving(true);

    try {
      await autosavePromiseRef.current?.catch(() => undefined);

      const response = await fetch(`/api/pm-jobs/${encodeURIComponent(site.jobId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          details: buildWorkDetails("submitted"),
          status: finalStatus === "abnormal" ? "abnormal" : "completed",
          startTime,
          endTime,
          result: finalStatus === "abnormal" ? "ผิดปกติ" : "ปกติ"
        })
      });
      const payload = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Cannot save PM job.");
      }

      lastSavedDraftRef.current = draftFingerprint;
      await onSaved();
      setSaveSuccess(saveSuccessMessage);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Cannot save PM job.");
    } finally {
      setIsSaving(false);
    }
  };
  const autosaveMessage = autosaveState === "saving"
    ? (lang === "th" ? "กำลังบันทึกร่างอัตโนมัติ..." : "Autosaving draft...")
    : autosaveState === "saved"
      ? (lang === "th" ? "บันทึกร่างอัตโนมัติแล้ว" : "Draft autosaved")
      : autosaveState === "error"
        ? (lang === "th" ? "บันทึกร่างอัตโนมัติไม่สำเร็จ" : "Draft autosave failed")
        : (lang === "th" ? "บันทึกร่างอัตโนมัติ" : "Draft autosave enabled");

  if (photoPopupOpen) {
    return (
      <PhotoEditorPage
        isUploading={isUploadingPhotos}
        photoNotes={photoNotes}
        photos={photos}
        uploadError={photoUploadError}
        onAddPhotoFiles={addPhotoFiles}
        onClose={() => setPhotoPopupOpen(false)}
        onNoteChange={setPhotoNote}
        onRemovePhoto={removePhoto}
      />
    );
  }

  return (
    <div className="detailPage">
      <FeedbackPopups
        alertMessage={saveError || saveSuccess}
        alertTitle={saveSuccess ? t("feedback.saveSuccess") : saveError ? t("feedback.saveFailed") : undefined}
        alertTone={saveSuccess ? "success" : "error"}
        alertVariant="status"
        loading={isSaving}
        loadingMessage={t("pm.loadingSubtitle")}
        onAlertClose={() => {
          setSaveError("");
          setSaveSuccess("");
        }}
      />
      <div className="detailTitle">
        <button className="backButton" type="button" onClick={handleBack} aria-label={t("common.back")}>
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
          <Info label={t("pm.pmCycle")} value={localizeLabel(displayPmCycle, lang)} />
          <Info label={t("history.visitRound")} value={`${visitRound}/${visitTotal || "-"}`} />
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
          <label className={startTime.trim() ? "label" : "label missingRequired"}>
            <RequiredLabel label={t("fields.startTime")} required={!startTime.trim()} />
            <TimePicker value={startTime} onChange={setStartTime} />
          </label>
          <label className={endTime.trim() ? "label" : "label missingRequired"}>
            <RequiredLabel label={t("fields.endTime")} required={!endTime.trim()} />
            <TimePicker value={endTime} onChange={setEndTime} />
          </label>
          <label className={`${inspector.trim() ? "label" : "label missingRequired"} inspectorField`}>
            <RequiredLabel label={t("common.inspector")} required={!inspector.trim()} />
            <AppSelect className="select" firstNameOnly value={inspector} onChange={(event) => setInspector(event.target.value)}>
              <option value="" disabled>{t("common.inspector")}</option>
              {!inspectorExists && inspector ? <option value={inspector}>{inspector}</option> : null}
              {systemUsers.map((user) => (
                <option key={user.id} value={user.name}>{user.name}</option>
              ))}
            </AppSelect>
          </label>
        </div>
      </section>
      {/* 
      <section className="card">
        <h2><ReceiptText size={17} /> {t("pm.expenses")}</h2>
        <div className="expenseGrid">
          {expenseFields.map((field) => (
            <label className="label" key={field.key}>
              {t(field.labelKey)}
              <input
                className="field"
                inputMode="decimal"
                value={expenses[field.key]}
                onChange={(event) => updateExpense(field.key, formatDecimalInputValue(event.target.value))}
              />
            </label>
          ))}
        </div>
      </section> */}

      <section className="card">
        <h2><ClipboardCheck size={17} /> {t("pm.checklist")}</h2>
        <label className="label contractSelectField">
          {t("pm.selectContract")}
          <AppSelect className="select" value={String(selectedContractIndex)} onChange={(event) => selectContractIndex(Number(event.target.value))}>
            {contractItems.map((contract, index) => (
              <option key={index} value={index}>{getSiteContractLabel(contract, index)}</option>
            ))}
          </AppSelect>
        </label>
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
                    activeCheckNoteKey={activeCheckNoteKey}
                    setActiveCheckNoteKey={setActiveCheckNoteKey}
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
          <button className="button subtle" type="button" onClick={() => setPhotoPopupOpen(true)}>
            <Camera size={16} />
            {t("pm.addPhoto")}
          </button>
          <div className="photoSummary">
            {photoUploadItems.map((item) => (
              <span key={item.key}>{t(item.labelKey)}: {photos[item.key].length}</span>
            ))}
          </div>
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
        <h2><CircleCheck size={17} /> <RequiredLabel label={t("pm.result")} required={!finalStatus} /></h2>
        <div className={finalStatus ? "summaryChoices" : "summaryChoices missingRequiredChoice"}>
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
        <label className={signerName.trim() ? "label" : "label missingRequired"}>
          <RequiredLabel label={t("fields.signerName")} required={!signerName.trim()} />
          <input className="field" value={signerName} onChange={(event) => setSignerName(event.target.value)} />
        </label>
        <SignaturePad value={customerSignature} onChange={setCustomerSignature} />
      </section>

      <div className="stickyActions">
        <div className="saveStatusGroup">
          {!canSubmit ? <span className="requiredHint">{requiredMessage}</span> : null}
          <span className={`autosaveStatus ${autosaveState}`}>{autosaveMessage}</span>
        </div>
        <button className="button ghost" type="button" onClick={handleBack}>{t("common.back")}</button>
        <button className="button primary" type="button" onClick={saveWork} disabled={isSaving || !canSubmit}>
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

function RequiredLabel({ label, required = true }: { label: string; required?: boolean }) {
  return (
    <span className="requiredLabel">
      {label}
      {required ? <b aria-hidden="true">*</b> : null}
    </span>
  );
}

function PhotoEditorPage({
  isUploading,
  photoNotes,
  photos,
  uploadError,
  onAddPhotoFiles,
  onClose,
  onNoteChange,
  onRemovePhoto
}: {
  isUploading: boolean;
  photoNotes: PhotoNotes;
  photos: PhotoState;
  uploadError: string;
  onAddPhotoFiles: (key: PhotoKey, fileList: FileList | null) => Promise<void>;
  onClose: () => void;
  onNoteChange: (key: PhotoKey, value: string) => void;
  onRemovePhoto: (key: PhotoKey, photoId: string) => void;
}) {
  const { t } = useUi();

  return (
    <div className="photoEditorPage">
      <header className="photoEditorHeader">
        <button aria-label={t("common.back")} className="photoEditorBackButton" type="button" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1><Camera size={20} /> {t("pm.photos")}</h1>
        </div>
      </header>

      <div className="photoEditorBody">
        {uploadError ? <p className="photoUploadError">{uploadError}</p> : null}
        {isUploading ? <p className="photoUploadStatus">{t("pm.uploadingPhotos")}</p> : null}
        <div className="photoPopupList">
          {photoUploadItems.map((item) => (
            <section className="photoPopupItem" key={item.key}>
              <div>
                <strong>{t(item.labelKey)}</strong>
                <span>{photos[item.key].length} {t("common.files")}</span>
              </div>
              <div className="photoPopupButtons">
                <label className={`photoUploadButton${isUploading ? " isDisabled" : ""}`}>
                  <Upload size={15} />
                  {t("pm.uploadPhoto")}
                  <input
                    disabled={isUploading}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void onAddPhotoFiles(item.key, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                <label className={`photoUploadButton${isUploading ? " isDisabled" : ""}`}>
                  <Camera size={15} />
                  {t("pm.takePhoto")}
                  <input
                    disabled={isUploading}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      void onAddPhotoFiles(item.key, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              {photos[item.key].length > 0 ? (
                <div className="photoThumbGrid">
                  {photos[item.key].map((photo) => (
                    <figure className="photoThumbCard" key={photo.id}>
                      <img alt={photo.name} src={photo.dataUrl} />
                      <figcaption>{photo.name}</figcaption>
                      <button
                        aria-label={`${t("common.close")} ${photo.name}`}
                        className="photoThumbRemove"
                        type="button"
                        onClick={() => onRemovePhoto(item.key, photo.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </figure>
                  ))}
                </div>
              ) : null}
              <label className="label">
                {t("common.note")}
                <textarea
                  className="textarea compactTextarea"
                  value={photoNotes[item.key] ?? ""}
                  onChange={(event) => onNoteChange(item.key, event.target.value)}
                />
              </label>
            </section>
          ))}
        </div>
      </div>

      <footer className="photoEditorFooter">
        <button className="button primary" type="button" onClick={onClose}>{t("common.done")}</button>
      </footer>
    </div>
  );
}

function SignaturePad({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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

      if (value) {
        const image = new window.Image();
        image.onload = () => {
          context.drawImage(image, 0, 0, width, height);
        };
        image.src = value;
      }
    };

    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [value]);

  const exportSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    onChange(canvas.toDataURL("image/png"));
  };

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
    exportSignature();
  };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    onChange("");
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
  setCheckNote,
  activeCheckNoteKey,
  setActiveCheckNoteKey
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
  activeCheckNoteKey: string;
  setActiveCheckNoteKey: (item: string) => void;
}) {
  const { lang, t } = useUi();

  if (block.type === "fields") {
    const calibrateStatusKey = isDiagCalibrateFieldsBlock(groupKey, block)
      ? diagCalibrateStatusKey(groupKey, setTitle, blockIndex, block.title)
      : "";
    const calibrateStatus = calibrateStatusKey ? checkResults[calibrateStatusKey] : undefined;

    return (
      <section className="templateBlock">
        <h4>{localizeLabel(block.title, lang)}</h4>
        <div className={`templateGrid ${block.columns === "three" ? "threeCols" : block.columns === "four" ? "fourCols" : ""}`}>
          {block.fields.map((field) => {
            const key = fieldKey(groupKey, setTitle, blockIndex, field.label);
            const value = fieldValues[key] ?? resolveFieldValue(field, site) ?? "";
            const missingValue = !value.trim();

            return (
              <label className={missingValue ? "label missingRequired" : "label"} key={`${block.title}-${field.label}`}>
                <RequiredLabel label={localizeLabel(field.label, lang)} required={missingValue} />
                {isDateLikeField(field) ? (
                  <FormDateInput
                    value={value}
                    onChange={(nextValue) => setFieldValue(key, nextValue)}
                  />
                ) : isDecimalLikeField(field) ? (
                  <input
                    className="field"
                    inputMode="decimal"
                    type="text"
                    value={value}
                    placeholder={localizeLabel(field.placeholder ?? field.label, lang)}
                    onChange={(event) => setFieldValue(key, formatDecimalInputValue(event.target.value))}
                  />
                ) : (
                  <input
                    className="field"
                    type="text"
                    value={value}
                    placeholder={localizeLabel(field.placeholder ?? field.label, lang)}
                    onChange={(event) => setFieldValue(key, event.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
        {calibrateStatusKey ? (
          <div className="calibrateStatusPicker">
            <strong>Calibrate Status</strong>
            <div className="vx">
              <button
                className={calibrateStatus === "ok" ? "resultDot resultOk" : "resultDot resultChoiceOk"}
                type="button"
                aria-label={`ปกติ ${block.title}`}
                aria-pressed={calibrateStatus === "ok"}
                onClick={() => setCheckResult(calibrateStatusKey, "ok")}
              >
                <Check size={13} />
              </button>
              <span>ปกติ</span>
              <button
                className={calibrateStatus === "bad" ? "resultDot resultBad" : "resultDot resultChoiceBad"}
                type="button"
                aria-label={`ผิดปกติ ${block.title}`}
                aria-pressed={calibrateStatus === "bad"}
                onClick={() => setCheckResult(calibrateStatusKey, "bad")}
              >
                <X size={13} />
              </button>
              <span>ผิดปกติ</span>
            </div>
          </div>
        ) : null}
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
            resultKey={checkKey(resultPrefix, block.title, item)}
            checkResults={checkResults}
            setCheckResult={setCheckResult}
            checkNotes={checkNotes}
            setCheckNote={setCheckNote}
            activeCheckNoteKey={activeCheckNoteKey}
            setActiveCheckNoteKey={setActiveCheckNoteKey}
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
  setCheckNote,
  activeCheckNoteKey,
  setActiveCheckNoteKey
}: {
  item: string;
  resultKey: string;
  checkResults: Record<string, CheckResult>;
  setCheckResult: (item: string, result: CheckResult) => void;
  checkNotes: Record<string, string>;
  setCheckNote: (item: string, value: string) => void;
  activeCheckNoteKey: string;
  setActiveCheckNoteKey: (item: string) => void;
}) {
  const { lang, t } = useUi();
  const result = checkResults[resultKey];
  const noteIsOpen = activeCheckNoteKey === resultKey;
  const openRowNote = () => {
    setActiveCheckNoteKey(activeCheckNoteKey === resultKey ? "" : resultKey);
  };

  return (
    <div className={noteIsOpen ? "checkRow checkRowOpen" : "checkRow"} onClick={openRowNote}>
      <strong>{localizeLabel(item, lang)}</strong>
      <div className="vx">
        <button
          className={result === "ok" ? "resultDot resultOk" : "resultDot resultChoiceOk"}
          type="button"
          aria-label={`${t("pm.pass")}: ${localizeLabel(item, lang)}`}
          aria-pressed={result === "ok"}
          onClick={(event) => {
            event.stopPropagation();
            setCheckResult(resultKey, "ok");
            setActiveCheckNoteKey(resultKey);
          }}
        >
          <Check size={13} />
        </button>
        <button
          className={result === "bad" ? "resultDot resultBad" : "resultDot resultChoiceBad"}
          type="button"
          aria-label={`${t("pm.fail")}: ${localizeLabel(item, lang)}`}
          aria-pressed={result === "bad"}
          onClick={(event) => {
            event.stopPropagation();
            setCheckResult(resultKey, "bad");
            setActiveCheckNoteKey(resultKey);
          }}
        >
          <X size={13} />
        </button>
      </div>
      {noteIsOpen ? (
        <label className="label checkNoteField">
          {t("common.note")}
          <textarea
            className="textarea compactTextarea"
            value={checkNotes[resultKey] ?? ""}
            onClick={(event) => event.stopPropagation()}
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

function getSelectedItems(config: PmChecklistConfig, key: PmChecklistKey, sectionId: string, items: string[], includeLegacyCustomItems = false) {
  const selectedItems = config.selectedItems[key];
  const itemLabels = config.itemLabelsBySection[key]?.[sectionId] ?? {};
  const configuredItems = (selectedItems
    ? items.filter((item) => selectedItems.includes(item) || selectedItems.includes(itemLabels[item] ?? item))
    : items
  ).map((item) => itemLabels[item] ?? item);
  const sectionCustomItems = config.customItemsBySection[key]?.[sectionId] ?? [];
  const customItems = selectedItems ? sectionCustomItems.filter((item) => selectedItems.includes(item)) : sectionCustomItems;
  const legacyCustomItems = includeLegacyCustomItems ? config.customItems[key] ?? [] : [];
  const legacyItems = selectedItems ? legacyCustomItems.filter((item) => selectedItems.includes(item)) : legacyCustomItems;

  return [...configuredItems, ...customItems, ...legacyItems];
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
              { label: "License Studies", type: "decimal" },
              { label: "Current Studies Per Year", type: "decimal" },
              { label: "Antivirus Definition Date", type: "date" }
            ]
          },
          {
            type: "fields",
            title: "FREE SPACE (GB)",
            columns: "four",
            fields: [
              { label: "Database O: Free (GB)", type: "decimal" },
              { label: "Database O: Total (GB)", type: "decimal" },
              { label: "Warm DB Free (GB)", type: "decimal" },
              { label: "Warm DB Total (GB)", type: "decimal" }
            ]
          },
          { type: "checks", title: "SYNAPSE SYSTEM CHECKLIST", items: getSelectedItems(config, "synapse", "synapseSystem", synapseSystem, true) },
          { type: "checks", title: "CONFIGURATION BACKUP CHECKLIST", items: getSelectedItems(config, "synapse", "configurationBackup", configurationBackup) },
          { type: "fields", title: "CONFIGURATION BACKUP PATH", fields: [{ label: "Configuration Backup Path" }] },
          { type: "radios", label: "Backup Type", items: ["DR Site", "NAS", "Other"] },
          { type: "fields", title: "BACKUP DEVICE / DATA BACKUP CHECKING", fields: [{ label: "Location" }] },
          { type: "radios", label: "Hardware Status", items: ["ปกติ", "ผิดปกติ"] },
          { type: "radios", label: "Backup Status", items: ["ปกติ", "ผิดปกติ"] },
          { type: "fields", title: "RUNNING DATE", fields: [{ label: "Running Date", type: "date" }] }
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
          { type: "checks", title: "SERVER CHECKLIST", items: getSelectedItems(config, "server", "serverChecklist", serverChecklist, true) }
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
          { type: "checks", title: "SWITCH CHECKLIST", items: getSelectedItems(config, "switch", "switchChecklist", switchChecklist, true) }
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
          { type: "checks", title: "STORAGE CHECKLIST", items: getSelectedItems(config, "storage", "storageChecklist", storageChecklist, true) }
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
          { type: "checks", title: "ENVIRONMENT CHECKLIST: สภาพแวดล้อม", items: getSelectedItems(config, "environment", "environmentMain", environmentMain, true) },
          { type: "checks", title: "ENVIRONMENT CHECKLIST: ระบบสายสัญญาณและระบบไฟฟ้า", items: getSelectedItems(config, "environment", "environmentPower", environmentPower) },
          { type: "checks", title: "SECURITY CHECKLIST", items: getSelectedItems(config, "environment", "environmentSecurity", environmentSecurity) }
        ])
      };
    case "diag": {
      const monitorCount = config.diagMonitorCounts[setId] ?? 2;
      const physicalStatusFields = [
        "Act. Times Monitor 1",
        ...(monitorCount === 2 ? ["Act. Times Monitor 2"] : []),
        "Backlight Times Monitor 1",
        ...(monitorCount === 2 ? ["Backlight Times Monitor 2"] : []),
        "Mfg Date Monitor 1",
        ...(monitorCount === 2 ? ["Mfg Date Monitor 2"] : [])
      ];

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
            fields: ["Brand / Model", "S/N", "Target Min (cd/m²)", "Target Max (cd/m²)", "Result Min (cd/m²)", "Result Max (cd/m²)"].map((label) => ({
              label,
              type: label.includes("cd/m") ? "decimal" as const : undefined
            }))
          },
          ...(monitorCount === 2 ? [{
            type: "fields",
            title: "Calibrate: Monitor 2",
            columns: "three",
            fields: ["Brand / Model", "S/N", "Target Min (cd/m²)", "Target Max (cd/m²)", "Result Min (cd/m²)", "Result Max (cd/m²)"].map((label) => ({
              label,
              type: label.includes("cd/m") ? "decimal" as const : undefined
            }))
          } as ChecklistBlock] : []),
          { type: "radios", label: "Diagnostic Monitor / SMPTE Pattern", items: ["ปกติ", "ผิดปกติ"] },
          {
            type: "fields",
            title: monitorCount === 1 ? "Physical Status 1" : "Physical Status",
            columns: "three",
            fields: physicalStatusFields.map((label) => ({
              label,
              placeholder: label.includes("Date") ? "DD/MM/YYYY" : label,
              type: label.includes("Date") ? "date" as const : label.includes("Times") ? "decimal" as const : undefined
            }))
          },
          { type: "diagTable", title: "รายการตรวจสอบอุปกรณ์" }
        ]
      };
    }
  }
}
