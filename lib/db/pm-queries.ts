import { buildPmAppData, formatVisitTime, type PmJobRecord, type PmWorkDetails, type SiteCatalogRecord, type SiteContractDetails, type SiteRecord } from "@/lib/pm-data";
import { getSql } from "@/lib/db/sql";
import type { Json, PmJobRow, SiteRow } from "@/lib/db/types";

type PmJobWithSiteRow = PmJobRow & { sites: SiteRow | null };
type WorkResult = NonNullable<PmJobRecord["result"]>;

function toWorkDetails(value: Json | undefined): PmWorkDetails | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const details = value as PmWorkDetails;

  return {
    ...details,
    startTime: details.startTime ? formatVisitTime(details.startTime) : details.startTime,
    endTime: details.endTime ? formatVisitTime(details.endTime) : details.endTime
  };
}

function toContractDetails(value: Json | undefined): SiteContractDetails | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as SiteContractDetails : undefined;
}

function toWorkResult(value: string | null): PmJobRecord["result"] {
  return value === "ปกติ" || value === "ผิดปกติ" ? value as WorkResult : undefined;
}

function toSiteCatalogRecord(row: SiteRow): SiteCatalogRecord {
  return {
    id: row.id,
    site: row.site,
    customer: row.customer,
    contact: row.contact,
    phone: row.phone,
    province: row.province,
    region: row.region,
    owner: row.owner,
    contract: row.contract,
    contractDetails: toContractDetails(row.contract_details),
    address: row.address,
    department: row.department,
    email: row.email
  };
}

function toPmJobRecord(row: PmJobRow): PmJobRecord {
  return {
    id: row.id,
    siteId: row.site_id,
    status: row.status,
    pmCycle: row.pm_cycle,
    visitDate: row.visit_date,
    visitTime: formatVisitTime(row.visit_time),
    owner: row.owner,
    startTime: formatVisitTime(row.start_time) || undefined,
    endTime: formatVisitTime(row.end_time) || undefined,
    workDetails: toWorkDetails(row.work_details),
    result: toWorkResult(row.result)
  };
}

function toSiteRecord(row: PmJobWithSiteRow): SiteRecord | null {
  if (!row.sites) {
    return null;
  }

  const site = toSiteCatalogRecord(row.sites);

  return {
    ...site,
    jobId: row.id,
    status: row.status,
    pmCycle: row.pm_cycle,
    visitDate: row.visit_date,
    visitTime: formatVisitTime(row.visit_time),
    owner: site.owner,
    startTime: formatVisitTime(row.start_time) || undefined,
    endTime: formatVisitTime(row.end_time) || undefined,
    workDetails: toWorkDetails(row.work_details),
    result: toWorkResult(row.result)
  };
}

function uniqueSiteRecords(sites: SiteRecord[]) {
  const seenSites = new Set<string>();

  return sites.filter((site) => {
    const key = `${site.id}:${site.visitDate}:${site.visitTime}`;

    if (seenSites.has(key)) {
      return false;
    }

    seenSites.add(key);
    return true;
  });
}

function mapPmJobWithSiteRows(rows: PmJobWithSiteRow[]) {
  return uniqueSiteRecords(rows.map(toSiteRecord).filter((site): site is SiteRecord => site !== null));
}

export async function listSitesFromDb() {
  const sql = getSql();
  const data = await sql<SiteRow[]>`select * from sites order by site`;

  return data.map(toSiteCatalogRecord);
}

export async function listPmJobsFromDb() {
  const sql = getSql();
  const data = await sql<PmJobRow[]>`select * from pm_jobs order by visit_date desc`;

  return data.map(toPmJobRecord);
}

export async function listWorkSitesFromDb() {
  const sql = getSql();
  const data = await sql<PmJobWithSiteRow[]>`
    select j.*, to_jsonb(s) as sites
    from pm_jobs j
    inner join sites s on s.id = j.site_id
    order by j.visit_date desc, j.visit_time
  `;

  return mapPmJobWithSiteRows(data);
}

export async function getWorkSitesByDateFromDb(date: string) {
  const sql = getSql();
  const data = await sql<PmJobWithSiteRow[]>`
    select j.*, to_jsonb(s) as sites
    from pm_jobs j
    inner join sites s on s.id = j.site_id
    where j.visit_date = ${date}::date
    order by j.visit_time
  `;

  return mapPmJobWithSiteRows(data);
}

export async function getWorkSiteBySiteIdFromDb(siteId: string) {
  const sql = getSql();
  const data = await sql<PmJobWithSiteRow[]>`
    select j.*, to_jsonb(s) as sites
    from pm_jobs j
    inner join sites s on s.id = j.site_id
    where j.site_id = ${siteId}
    order by j.visit_date desc
    limit 1
  `;

  return data[0] ? toSiteRecord(data[0]) : null;
}

export async function getPmAppDataFromDb() {
  const [siteCatalog, pmJobs, sites] = await Promise.all([
    listSitesFromDb(),
    listPmJobsFromDb(),
    listWorkSitesFromDb()
  ]);

  return buildPmAppData({ siteCatalog, pmJobs, sites });
}
