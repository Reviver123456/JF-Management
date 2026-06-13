import { buildPmAppData, type PmJobRecord, type PmWorkDetails, type SiteCatalogRecord, type SiteContractDetails, type SiteRecord } from "@/lib/pm-data";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
type PmJobRow = Database["public"]["Tables"]["pm_jobs"]["Row"];
type PmJobWithSiteRow = PmJobRow & { sites: SiteRow | null };
type WorkResult = NonNullable<PmJobRecord["result"]>;

function toWorkDetails(value: Json | undefined): PmWorkDetails | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PmWorkDetails : undefined;
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
    visitTime: row.visit_time,
    owner: row.owner,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
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
    visitTime: row.visit_time,
    owner: site.owner,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
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

async function createDataClient() {
  return createClient();
}

function formatReportDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export async function listSitesFromDb() {
  const supabase = await createDataClient();
  const { data, error } = await supabase.from("sites").select("*").order("site");

  if (error) {
    throw new Error(`Supabase sites query failed: ${error.message}`);
  }

  return data.map(toSiteCatalogRecord);
}

export async function listPmJobsFromDb() {
  const supabase = await createDataClient();
  const { data, error } = await supabase.from("pm_jobs").select("*").order("visit_date", { ascending: false });

  if (error) {
    throw new Error(`Supabase pm_jobs query failed: ${error.message}`);
  }

  return data.map(toPmJobRecord);
}

export async function listWorkSitesFromDb() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("pm_jobs")
    .select("*, sites(*)")
    .order("visit_date", { ascending: false })
    .order("visit_time");

  if (error) {
    throw new Error(`Supabase work sites query failed: ${error.message}`);
  }

  return uniqueSiteRecords((data as PmJobWithSiteRow[]).map(toSiteRecord).filter((site): site is SiteRecord => site !== null));
}

export async function getWorkSitesByDateFromDb(date: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("pm_jobs")
    .select("*, sites(*)")
    .eq("visit_date", date)
    .order("visit_time");

  if (error) {
    throw new Error(`Supabase work sites query failed: ${error.message}`);
  }

  return uniqueSiteRecords((data as PmJobWithSiteRow[]).map(toSiteRecord).filter((site): site is SiteRecord => site !== null));
}

export async function getWorkSiteBySiteIdFromDb(siteId: string) {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("pm_jobs")
    .select("*, sites(*)")
    .eq("site_id", siteId)
    .order("visit_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase work site query failed: ${error.message}`);
  }

  return data ? toSiteRecord(data as PmJobWithSiteRow) : null;
}

export async function listReportRowsFromDb() {
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("pm_jobs")
    .select("*, sites(*)")
    .in("status", ["completed", "abnormal"])
    .order("visit_date", { ascending: false });

  if (error) {
    throw new Error(`Supabase reports query failed: ${error.message}`);
  }

  return (data as PmJobWithSiteRow[]).flatMap((row) => {
    const site = toSiteRecord(row);

    if (!site) {
      return [];
    }

    return {
      id: row.id.replace("PM-", "R-"),
      jobId: row.id,
      siteId: site.id,
      site: site.site,
      customer: site.customer,
      date: formatReportDate(row.visit_date),
      inspector: row.owner,
      province: site.province,
      startTime: row.start_time ?? row.visit_time,
      endTime: row.end_time ?? "",
      workDetails: toWorkDetails(row.work_details),
      result: row.result ?? (row.status === "abnormal" ? "ผิดปกติ" : "ปกติ")
    };
  });
}

export async function getPmAppDataFromDb() {
  const [siteCatalog, pmJobs, sites] = await Promise.all([
    listSitesFromDb(),
    listPmJobsFromDb(),
    listWorkSitesFromDb()
  ]);

  return buildPmAppData({ siteCatalog, pmJobs, sites });
}
