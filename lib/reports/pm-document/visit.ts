import {
  getContractVisitTotal,
  getSiteContractAt,
  getUniquePmJobs,
  type PmJobRecord,
  type ReportRow,
  type SiteCatalogRecord
} from "@/lib/pm-data";
import { toInputDate } from "@/lib/reports/pm-report-list-filters";

export function getVisitRoundText(
  pmJobs: PmJobRecord[],
  row: ReportRow,
  site: SiteCatalogRecord | null,
  contractIndex = 0
) {
  const matchedJob = getMatchingReportJob(pmJobs, row);
  const visitRound = getVisitRoundForReport(pmJobs, row);
  const selectedContract = getSiteContractAt(site, contractIndex);
  const visitTotal = getContractVisitTotal(selectedContract, matchedJob?.pmCycle);

  return `${visitRound}/${visitTotal || "-"}`;
}

export function getMatchingReportJob(pmJobs: PmJobRecord[], row: ReportRow) {
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