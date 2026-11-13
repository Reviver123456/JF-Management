import { describe, expect, it } from "vitest";
import {
  getPlanJobVisitRoundText,
  getPlanOwnerSummarySets,
  getPlanReportJobs,
  getSiteReportRows,
  summarizePlanJobs,
  summarizeSiteRows
} from "@/lib/operational-report-data";
import type { PmJobRecord, SiteCatalogRecord } from "@/lib/pm-data";
import { getPeriodRange } from "@/lib/report-period";

const site: SiteCatalogRecord = {
  address: "Address",
  contact: "Contact",
  contract: "C-1",
  contractDetails: {
    visitCount: "3"
  },
  customer: "Hospital A",
  department: "IT",
  email: "site@example.com",
  id: "site-1",
  owner: "Owner One",
  phone: "000",
  province: "Bangkok",
  region: "Central",
  site: "Site A"
};

const jobs: PmJobRecord[] = [
  {
    id: "job-1",
    owner: "Owner One",
    pmCycle: "Q1",
    siteId: "site-1",
    status: "completed",
    visitDate: "2026-03-10",
    visitTime: "09:00"
  },
  {
    id: "job-2",
    owner: "Owner One",
    pmCycle: "Q1",
    siteId: "site-1",
    status: "abnormal",
    visitDate: "2026-03-15",
    visitTime: "10:00"
  },
  {
    id: "job-3",
    owner: "Owner Two",
    pmCycle: "Q1",
    siteId: "site-1",
    status: "pending",
    visitDate: "2026-04-01",
    visitTime: "11:00"
  }
];

describe("operational-report-data", () => {
  it("filters plan jobs by period and owner", () => {
    const periodRange = getPeriodRange("monthly", {
      anchor: "2026-03",
      anchorEnd: "",
      anchorStart: "",
      dailyEndDate: "2026-03-31",
      dailyStartDate: "2026-03-01"
    });
    const result = getPlanReportJobs({
      ownerFilter: "Owner One",
      periodRange,
      pmJobs: jobs,
      siteCatalog: [site]
    });

    expect(result).toHaveLength(2);
    expect(summarizePlanJobs(result)).toMatchObject({
      total: 2,
      completed: 2,
      inProgress: 0
    });
  });

  it("formats visit round as current/total", () => {
    expect(getPlanJobVisitRoundText(jobs, jobs[1], site)).toBe("2/3");
  });

  it("builds owner summary sets with site and day counts", () => {
    expect(getPlanOwnerSummarySets(jobs)).toEqual([
      {
        owner: "owner one",
        siteCount: 1,
        dayCount: 2
      },
      {
        owner: "owner two",
        siteCount: 1,
        dayCount: 1
      }
    ]);
  });

  it("lists site contracts for the report", () => {
    const periodRange = getPeriodRange("monthly", {
      anchor: "2026-03",
      anchorEnd: "",
      anchorStart: "",
      dailyEndDate: "2026-03-31",
      dailyStartDate: "2026-03-01"
    });
    const rows = getSiteReportRows({
      ownerFilter: "Owner One",
      periodRange,
      siteCatalog: [site]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].contractNumber).toBe("C-1");
    expect(rows[0].visitTotal).toBe(3);
    expect(summarizeSiteRows(rows)).toMatchObject({
      sites: 1,
      contracts: 1
    });
  });
});
