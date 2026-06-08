export type WorkStatus = "completed" | "inProgress" | "pending" | "abnormal";

type StatusClassName = "success" | "info" | "warning" | "danger";

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
  const siteById = new Map(siteCatalog.map((site) => [site.id, site]));

  return {
    siteCatalog,
    pmJobs,
    sites,
    metrics: [
      { id: "sites", value: String(siteCatalog.length), trend: "+0", color: "blue" },
      { id: "monthly", value: String(pmJobs.filter((job) => job.visitDate.startsWith("2026-06")).length), trend: "+0", color: "purple" },
      { id: "done", value: String(pmJobs.filter((job) => job.status === "completed").length), trend: "+0", color: "green" },
      { id: "backlog", value: String(pmJobs.filter((job) => job.status === "pending" || job.status === "inProgress").length), trend: "", color: "orange" }
    ],
    scheduleDays: getScheduleDaysForSites(pmJobs, siteCatalog),
    reportRows: pmJobs
      .filter((job) => job.status === "completed" || job.status === "abnormal")
      .flatMap((job) => {
        const site = siteById.get(job.siteId);

        if (!site) {
          return [];
        }

        return {
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
          result: job.result ?? (job.status === "abnormal" ? "ผิดปกติ" : "ปกติ")
        };
      }),
    provinces: Array.from(new Set(siteCatalog.map((site) => site.province))),
    owners: Array.from(new Set(pmJobs.map((job) => job.owner))),
    regions: Array.from(new Set(siteCatalog.map((site) => site.region)))
  };
}
