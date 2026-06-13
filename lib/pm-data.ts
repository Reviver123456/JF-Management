export type WorkStatus = "completed" | "inProgress" | "pending" | "abnormal";

type StatusClassName = "success" | "info" | "warning" | "danger";
export type CheckResult = "ok" | "bad";
export type FinalStatus = "normal" | "abnormal";

export type SiteContractDetails = {
  contractEndDate?: string;
  contractEndMonth?: string;
  contractNote?: string;
  contractStartDate?: string;
  contractStartMonth?: string;
  contractCount?: string;
  contractNumber?: string;
  contracts?: SiteContractItem[];
  projectName?: string;
  pmCycle?: string;
  visitCount?: string;
  visitMonths?: string[];
  checklistConfig?: unknown;
};

export type SiteContractItem = {
  checklistConfig?: unknown;
  contractEndDate?: string;
  contractNote?: string;
  contractNumber?: string;
  contractStartDate?: string;
  pmCycle?: string;
  projectName?: string;
  visitCount?: string;
  visitMonths?: string[];
};

export type SavedSparePart = {
  id: number;
  name: string;
  quantity: string;
  note: string;
};

export type SavedChecklistField = {
  label: string;
  placeholder?: string;
  value?: string;
};

export type SavedChecklistBlock =
  | { type: "fields"; title: string; fields: SavedChecklistField[]; columns?: "two" | "three" | "four" }
  | { type: "checks"; title: string; items: string[] }
  | { type: "radios"; label: string; items: string[] }
  | { type: "diagTable"; title: string };

export type SavedChecklistSet = {
  title: string;
  blocks: SavedChecklistBlock[];
};

export type SavedChecklistGroup = {
  key: string;
  title: string;
  sets: SavedChecklistSet[];
};

export type PmExpenseDetails = {
  carRental?: string;
  fuel?: string;
  general?: string;
  lodging?: string;
  other?: string;
  toll?: string;
};

export type PmWorkDetails = {
  checkNotes?: Record<string, string>;
  checkResults?: Record<string, CheckResult>;
  checklistSnapshot?: SavedChecklistGroup[];
  draftStatus?: "draft" | "submitted";
  expenses?: PmExpenseDetails;
  fieldValues?: Record<string, string>;
  finalStatus?: FinalStatus | null;
  inspector?: string;
  pmOrderNo?: string;
  photoNotes?: Record<string, string>;
  photos?: Record<string, string[]>;
  radioValues?: Record<string, string>;
  savedAt?: string;
  signerName?: string;
  inspectorSignature?: string;
  customerSignature?: string;
  spareParts?: SavedSparePart[];
  startTime?: string;
  endTime?: string;
  summaryNote?: string;
};

export type SiteCatalogRecord = {
  id: string;
  site: string;
  customer: string;
  contact: string;
  phone: string;
  province: string;
  region: string;
  owner: string;
  contract: string;
  contractDetails?: SiteContractDetails;
  address: string;
  department: string;
  email: string;
};

export type PmJobRecord = {
  id: string;
  siteId: string;
  status: WorkStatus;
  pmCycle: string;
  visitDate: string;
  visitTime: string;
  owner: string;
  startTime?: string;
  endTime?: string;
  workDetails?: PmWorkDetails;
  result?: "ปกติ" | "ผิดปกติ";
};

export type SiteRecord = SiteCatalogRecord & {
  jobId: string;
  status: WorkStatus;
  pmCycle: string;
  visitDate: string;
  visitTime: string;
  owner: string;
  startTime?: string;
  endTime?: string;
  workDetails?: PmWorkDetails;
  result?: "ปกติ" | "ผิดปกติ";
};

export type ReportRow = {
  id: string;
  jobId: string;
  siteId: string;
  site: string;
  customer: string;
  date: string;
  inspector: string;
  province: string;
  startTime: string;
  endTime: string;
  workDetails?: PmWorkDetails;
  result: "ปกติ" | "ผิดปกติ";
};

export type Metric = {
  id: "sites" | "monthly" | "done" | "backlog";
  value: string;
  trend: string;
  color: "blue" | "purple" | "green" | "orange";
};

export type ScheduleDay = {
  day: number;
  jobs: string[];
};

export type PmAppData = {
  siteCatalog: SiteCatalogRecord[];
  pmJobs: PmJobRecord[];
  sites: SiteRecord[];
  metrics: Metric[];
  scheduleDays: ScheduleDay[];
  reportRows: ReportRow[];
  provinces: string[];
  owners: string[];
  regions: string[];
};

export const emptyPmAppData: PmAppData = {
  siteCatalog: [],
  pmJobs: [],
  sites: [],
  metrics: [
    { id: "sites", value: "0", trend: "+0", color: "blue" },
    { id: "monthly", value: "0", trend: "+0", color: "purple" },
    { id: "done", value: "0", trend: "+0", color: "green" },
    { id: "backlog", value: "0", trend: "", color: "orange" }
  ],
  scheduleDays: [],
  reportRows: [],
  provinces: [],
  owners: [],
  regions: []
};

export const statusMeta: Record<WorkStatus, { className: StatusClassName }> = {
  completed: { className: "success" },
  inProgress: { className: "info" },
  pending: { className: "warning" },
  abnormal: { className: "danger" }
};

export function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWorkSitesByDate(sites: SiteRecord[], date: string) {
  return sites.filter((site) => site.visitDate === date);
}

export function getWorkSiteBySiteId(sites: SiteRecord[], siteId: string) {
  return sites.find((site) => site.id === siteId) ?? null;
}

export function getWorkSiteByJobId(sites: SiteRecord[], jobId: string) {
  return sites.find((site) => site.jobId === jobId) ?? null;
}

export function getVisitCountForPmCycle(pmCycle: string | null | undefined) {
  const normalizedCycle = (pmCycle ?? "").trim().toLowerCase().replace(/\s+/g, "");

  if (!normalizedCycle) {
    return 0;
  }

  if (normalizedCycle.includes("รายเดือน") || normalizedCycle.includes("monthly")) {
    return 12;
  }

  if (normalizedCycle.includes("ราย3") || normalizedCycle.includes("ไตรมาส") || normalizedCycle.includes("quarter")) {
    return 4;
  }

  if (normalizedCycle.includes("ราย4")) {
    return 3;
  }

  if (normalizedCycle.includes("ครึ่ง") || normalizedCycle.includes("semi")) {
    return 2;
  }

  if (normalizedCycle.includes("รายปี") || normalizedCycle.includes("annual") || normalizedCycle.includes("year")) {
    return 1;
  }

  return 0;
}

export function getContractVisitTotal(contractDetails: SiteContractDetails | undefined, fallbackPmCycle?: string) {
  const savedVisitCount = Number(contractDetails?.visitCount ?? "0");

  if (Number.isFinite(savedVisitCount) && savedVisitCount > 0) {
    return savedVisitCount;
  }

  return getVisitCountForPmCycle(contractDetails?.pmCycle ?? fallbackPmCycle);
}

export const contractCountOptions = [1, 2, 3, 4, 5, 6] as const;

export function getContractCount(contractDetails: SiteContractDetails | undefined) {
  const rawCount = Number(contractDetails?.contractCount ?? contractDetails?.contracts?.length ?? 1);

  if (!Number.isFinite(rawCount)) {
    return 1;
  }

  return Math.min(6, Math.max(1, Math.trunc(rawCount)));
}

export function getSiteContractItems(site: Pick<SiteCatalogRecord, "contract" | "contractDetails"> | null | undefined) {
  const details = site?.contractDetails;
  const count = getContractCount(details);
  const savedContracts = Array.isArray(details?.contracts) ? details.contracts : [];
  const legacyContract: SiteContractItem = {
    checklistConfig: details?.checklistConfig,
    contractEndDate: details?.contractEndDate,
    contractNote: details?.contractNote,
    contractNumber: details?.contractNumber ?? site?.contract,
    contractStartDate: details?.contractStartDate,
    pmCycle: details?.pmCycle,
    projectName: details?.projectName,
    visitCount: details?.visitCount,
    visitMonths: details?.visitMonths
  };

  return Array.from({ length: count }, (_, index) => ({
    ...(index === 0 ? legacyContract : {}),
    ...(savedContracts[index] ?? {})
  }));
}

export function getSiteContractAt(site: Pick<SiteCatalogRecord, "contract" | "contractDetails"> | null | undefined, index: number) {
  const contracts = getSiteContractItems(site);
  return contracts[Math.min(Math.max(index, 0), contracts.length - 1)] ?? contracts[0] ?? {};
}

export function getSiteContractLabel(contract: SiteContractItem | undefined, index: number) {
  const contractNumber = contract?.contractNumber?.trim();
  return contractNumber ? `สัญญา ${index + 1} - ${contractNumber}` : `สัญญา ${index + 1}`;
}

export function getSiteProjectName(site: Pick<SiteCatalogRecord, "contract" | "contractDetails" | "site"> | null | undefined, index: number) {
  return getSiteContractAt(site, index).projectName?.trim() || site?.site || "";
}

export function normalizeOwnerName(owner: string | null | undefined) {
  return (owner ?? "").trim().toLowerCase();
}

export function filterSitesByOwner<T extends { owner: string }>(sites: T[], owner: string | null | undefined) {
  const normalizedOwner = normalizeOwnerName(owner);

  if (!normalizedOwner) {
    return [];
  }

  return sites.filter((site) => normalizeOwnerName(site.owner) === normalizedOwner);
}

export function filterPmJobsByParticipant(pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[], owner: string | null | undefined) {
  const normalizedOwner = normalizeOwnerName(owner);

  if (!normalizedOwner) {
    return [];
  }

  const ownedSiteIds = new Set(
    siteCatalog
      .filter((site) => normalizeOwnerName(site.owner) === normalizedOwner)
      .map((site) => site.id)
  );

  return pmJobs.filter((job) => ownedSiteIds.has(job.siteId) || normalizeOwnerName(job.owner) === normalizedOwner);
}

export function getPmJobKey(job: Pick<PmJobRecord, "siteId" | "visitDate" | "visitTime">) {
  return `${job.siteId}:${job.visitDate}:${job.visitTime}`;
}

export function getSiteRecordJobKey(site: Pick<SiteRecord, "id" | "visitDate" | "visitTime">) {
  return `${site.id}:${site.visitDate}:${site.visitTime}`;
}

export function getUniquePmJobs(pmJobs: PmJobRecord[]) {
  const jobsByKey = new Map<string, PmJobRecord>();

  pmJobs.forEach((job) => {
    const key = getPmJobKey(job);
    const currentJob = jobsByKey.get(key);

    if (!currentJob || getStatusWeight(job.status) > getStatusWeight(currentJob.status)) {
      jobsByKey.set(key, job);
    }
  });

  return Array.from(jobsByKey.values());
}

export function getVisitRoundForJob(
  pmJobs: PmJobRecord[],
  siteId: string,
  jobId: string,
  visitDate: string,
  visitTime: string
) {
  const uniqueJobs = getUniquePmJobs(pmJobs.filter((job) => job.siteId === siteId))
    .sort((first, second) => (
      first.visitDate.localeCompare(second.visitDate) ||
      first.visitTime.localeCompare(second.visitTime)
    ));
  const jobIndex = uniqueJobs.findIndex((job) => job.id === jobId);

  if (jobIndex >= 0) {
    return jobIndex + 1;
  }

  return uniqueJobs.findIndex((job) => job.visitDate === visitDate && job.visitTime === visitTime) + 1 || 1;
}

export function getScheduleDaysForSites(pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[]) {
  const siteById = new Map(siteCatalog.map((site) => [site.id, site]));
  const seenJobs = new Set<string>();

  return Array.from(
    pmJobs.reduce((days, job) => {
      const day = Number(job.visitDate.slice(-2));
      const site = siteById.get(job.siteId);
      const scheduleKey = `${job.visitDate}:${job.visitTime}:${job.siteId}`;

      if (site && !seenJobs.has(scheduleKey)) {
        seenJobs.add(scheduleKey);
        days.set(day, [...(days.get(day) ?? []), site.site]);
      }

      return days;
    }, new Map<number, string[]>())
  ).map(([day, jobs]) => ({ day, jobs }));
}

function getStatusWeight(status: WorkStatus) {
  switch (status) {
    case "abnormal":
      return 4;
    case "completed":
      return 3;
    case "inProgress":
      return 2;
    case "pending":
      return 1;
  }
}

function formatReportDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function buildPmAppData({
  siteCatalog,
  pmJobs,
  sites
}: {
  siteCatalog: SiteCatalogRecord[];
  pmJobs: PmJobRecord[];
  sites: SiteRecord[];
}): PmAppData {
  const uniquePmJobs = getUniquePmJobs(pmJobs);

  return {
    siteCatalog,
    pmJobs,
    sites,
    metrics: [
      { id: "sites", value: String(siteCatalog.length), trend: "+0", color: "blue" },
      { id: "monthly", value: String(uniquePmJobs.filter((job) => job.visitDate.startsWith("2026-06")).length), trend: "+0", color: "purple" },
      { id: "done", value: String(uniquePmJobs.filter((job) => job.status === "completed").length), trend: "+0", color: "green" },
      { id: "backlog", value: String(uniquePmJobs.filter((job) => job.status === "pending" || job.status === "inProgress").length), trend: "", color: "orange" }
    ],
    scheduleDays: getScheduleDaysForSites(pmJobs, siteCatalog),
    reportRows: buildReportRows(pmJobs, siteCatalog),
    provinces: Array.from(new Set(siteCatalog.map((site) => site.province))),
    owners: Array.from(new Set(pmJobs.map((job) => job.owner))),
    regions: Array.from(new Set(siteCatalog.map((site) => site.region)))
  };
}

function buildReportRows(pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[]) {
  const siteById = new Map(siteCatalog.map((site) => [site.id, site]));
  const reportRows = new Map<string, ReportRow>();

  pmJobs
    .filter((job) => job.status === "completed" || job.status === "abnormal")
    .forEach((job) => {
      const site = siteById.get(job.siteId);

      if (!site) {
        return;
      }

      const key = getPmJobKey(job);
      const currentRow = reportRows.get(key);
      const result = job.result ?? (job.status === "abnormal" ? "ผิดปกติ" : "ปกติ");

      if (!currentRow) {
        reportRows.set(key, {
          id: job.id.replace("PM-", "R-"),
          jobId: job.id,
          siteId: site.id,
          site: site.site,
          customer: site.customer,
          date: formatReportDate(job.visitDate),
          inspector: job.owner,
          province: site.province,
          startTime: job.startTime ?? job.visitTime,
          endTime: job.endTime ?? "",
          workDetails: job.workDetails,
          result
        });
        return;
      }

      if (!currentRow.inspector.split(", ").some((inspector) => normalizeOwnerName(inspector) === normalizeOwnerName(job.owner))) {
        currentRow.inspector = `${currentRow.inspector}, ${job.owner}`;
      }

      if (job.status === "abnormal") {
        currentRow.result = result;
      }

      currentRow.startTime = currentRow.startTime || job.startTime || job.visitTime;
      currentRow.endTime = currentRow.endTime || job.endTime || "";
      currentRow.workDetails = currentRow.workDetails ?? job.workDetails;
    });

  return Array.from(reportRows.values()).sort((first, second) => second.date.localeCompare(first.date));
}
