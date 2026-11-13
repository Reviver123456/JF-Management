import {
  filterPmJobsByParticipant,
  filterSitesByOwner,
  getSiteContractItems,
  getSiteContractVisitTotal,
  getUniquePmJobs,
  getVisitRoundForJob,
  normalizeOwnerName,
  type PmJobRecord,
  type SiteCatalogRecord,
  type WorkStatus
} from "@/lib/pm-data";
import { isAllOwners } from "@/lib/owner-filter";
import { isDateWithinPeriod, type ReportPeriodRange } from "@/lib/report-period";

export function getPlanReportJobs({
  ownerFilter,
  periodRange,
  pmJobs,
  siteCatalog
}: {
  ownerFilter: string;
  periodRange: ReportPeriodRange | null;
  pmJobs: PmJobRecord[];
  siteCatalog: SiteCatalogRecord[];
}) {
  const scopedJobs = isAllOwners(ownerFilter)
    ? pmJobs
    : filterPmJobsByParticipant(pmJobs, siteCatalog, ownerFilter);

  if (!periodRange) {
    return [];
  }

  return getUniquePmJobs(scopedJobs)
    .filter((job) => isDateWithinPeriod(job.visitDate, periodRange))
    .sort((first, second) => (
      first.visitDate.localeCompare(second.visitDate) || first.visitTime.localeCompare(second.visitTime)
    ));
}

export function formatPlanJobVisitDate(visitDate: string) {
  const [year, month, day] = visitDate.split("-");

  if (!year || !month || !day) {
    return visitDate;
  }

  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

export function formatOperationalDisplayDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "-";
  }

  if (trimmed.includes("/")) {
    return trimmed;
  }

  return formatPlanJobVisitDate(trimmed);
}

export function getPlanJobDisplayStatus(status: WorkStatus): "completed" | "inProgress" {
  return status === "completed" || status === "abnormal" ? "completed" : "inProgress";
}

export function getPlanJobStatusLabelKey(status: WorkStatus) {
  return getPlanJobDisplayStatus(status) === "completed" ? "common.completed" : "common.inProgress";
}

export function getPlanJobVisitRoundText(
  pmJobs: PmJobRecord[],
  job: PmJobRecord,
  site: Pick<SiteCatalogRecord, "contract" | "contractDetails"> | null | undefined
) {
  const visitRound = getVisitRoundForJob(pmJobs, job.siteId, job.id, job.visitDate, job.visitTime);
  const visitTotal = getSiteContractVisitTotal(site, 0, job.pmCycle);

  return `${visitRound}/${visitTotal || "-"}`;
}

export type OperationalOwnerSummarySet = {
  dayCount: number;
  owner: string;
  siteCount: number;
};

export function getPlanOwnerSummarySets(jobs: PmJobRecord[]): OperationalOwnerSummarySet[] {
  const byOwner = new Map<string, { days: Set<string>; sites: Set<string> }>();

  jobs.forEach((job) => {
    const owner = normalizeOwnerName(job.owner);

    if (!owner) {
      return;
    }

    const bucket = byOwner.get(owner) ?? { days: new Set<string>(), sites: new Set<string>() };
    bucket.sites.add(job.siteId);
    bucket.days.add(job.visitDate.trim().slice(0, 10));
    byOwner.set(owner, bucket);
  });

  return [...byOwner.entries()]
    .sort(([first], [second]) => first.localeCompare(second, "th"))
    .map(([owner, { days, sites }]) => ({
      owner,
      siteCount: sites.size,
      dayCount: days.size
    }));
}

export function getSiteOwnerSummarySets(
  rows: SiteReportRow[],
  pmJobs: PmJobRecord[],
  periodRange: ReportPeriodRange | null
): OperationalOwnerSummarySet[] {
  const jobsInPeriod = periodRange
    ? getUniquePmJobs(pmJobs).filter((job) => isDateWithinPeriod(job.visitDate, periodRange))
    : [];

  const ownerNames = new Set<string>();

  const addOwner = (value: string) => {
    const owner = normalizeOwnerName(value);

    if (owner) {
      ownerNames.add(owner);
    }
  };

  rows.forEach((row) => {
    addOwner(row.site.owner);
  });

  jobsInPeriod.forEach((job) => {
    addOwner(job.owner);
  });

  return [...ownerNames]
    .sort((first, second) => first.localeCompare(second, "th"))
    .map((owner) => {
      const siteIds = new Set(
        rows
          .filter((row) => normalizeOwnerName(row.site.owner) === owner)
          .map((row) => row.site.id)
      );

      const days = new Set(
        jobsInPeriod
          .filter((job) => normalizeOwnerName(job.owner) === owner)
          .map((job) => job.visitDate.trim().slice(0, 10))
      );

      jobsInPeriod
        .filter((job) => normalizeOwnerName(job.owner) === owner)
        .forEach((job) => siteIds.add(job.siteId));

      return {
        owner,
        siteCount: siteIds.size,
        dayCount: days.size
      };
    })
    .filter((set) => set.siteCount > 0 || set.dayCount > 0);
}

export function summarizePlanJobs(jobs: PmJobRecord[]) {
  let inProgress = 0;
  let completed = 0;

  jobs.forEach((job) => {
    if (getPlanJobDisplayStatus(job.status) === "completed") {
      completed += 1;
    } else {
      inProgress += 1;
    }
  });

  return {
    total: jobs.length,
    inProgress,
    completed
  };
}

export type SiteReportRow = {
  site: SiteCatalogRecord;
  contractIndex: number;
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  visitTotal: number;
};

export function getSiteReportRows({
  ownerFilter,
  periodRange,
  siteCatalog
}: {
  ownerFilter: string;
  periodRange: ReportPeriodRange | null;
  pmJobs?: PmJobRecord[];
  siteCatalog: SiteCatalogRecord[];
}) {
  const scopedSites = isAllOwners(ownerFilter)
    ? siteCatalog
    : filterSitesByOwner(siteCatalog, ownerFilter);

  if (!periodRange) {
    return [];
  }

  const siteRows: SiteReportRow[] = [];

  scopedSites.forEach((site) => {
    getSiteContractItems(site).forEach((contract, contractIndex) => {
      const contractNumber = contract.contractNumber?.trim()
        || (contractIndex === 0 ? site.contract.trim() : "")
        || "-";

      siteRows.push({
        site,
        contractIndex,
        contractNumber,
        contractStartDate: contract.contractStartDate ?? "",
        contractEndDate: contract.contractEndDate ?? "",
        visitTotal: getSiteContractVisitTotal(site, contractIndex, contract.pmCycle)
      });
    });
  });

  return siteRows.sort((first, second) => (
    first.site.site.localeCompare(second.site.site, "th")
    || first.contractIndex - second.contractIndex
  ));
}

export function summarizeSiteRows(rows: SiteReportRow[]) {
  const siteIds = new Set(rows.map((row) => row.site.id));

  return {
    sites: siteIds.size,
    contracts: rows.length
  };
}

export function formatSiteVisitTotal(value: number) {
  return value > 0 ? String(value) : "-";
}
