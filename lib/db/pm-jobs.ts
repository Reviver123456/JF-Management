import { getSql } from "@/lib/db/sql";
import type { Json, PmJobInsert, PmJobRow, PmJobUpdate, WorkStatus } from "@/lib/db/types";

export async function findSiteById(siteId: string) {
  const sql = getSql();
  const rows = await sql<{ id: string; owner: string }[]>`
    select id, owner
    from sites
    where id = ${siteId}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function findPmJobById(jobId: string) {
  const sql = getSql();
  const rows = await sql<PmJobRow[]>`
    select *
    from pm_jobs
    where id = ${jobId}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function findPmJobInMonth(siteId: string, rangeStart: string, rangeEnd: string) {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    select id
    from pm_jobs
    where site_id = ${siteId}
      and visit_date >= ${rangeStart}::date
      and visit_date < ${rangeEnd}::date
    limit 1
  `;

  return rows[0] ?? null;
}

export async function listPmJobsInMonth(siteId: string, rangeStart: string, rangeEnd: string) {
  const sql = getSql();
  return sql<{ id: string; site_id: string; visit_date: string; visit_time: string }[]>`
    select id, site_id, visit_date, visit_time
    from pm_jobs
    where site_id = ${siteId}
      and visit_date >= ${rangeStart}::date
      and visit_date < ${rangeEnd}::date
  `;
}

export async function insertPmJobs(rows: PmJobInsert[]) {
  const sql = getSql();
  await sql`insert into pm_jobs ${sql(rows)}`;
}

export async function deletePmJobGroup(siteId: string, visitDate: string, visitTime: string) {
  const sql = getSql();
  await sql`
    delete from pm_jobs
    where site_id = ${siteId}
      and visit_date = ${visitDate}::date
      and visit_time = ${visitTime}::time
  `;
}

export async function deletePmJobGroupCount(siteId: string, visitDate: string, visitTime: string) {
  const sql = getSql();
  const rows = await sql<{ count: string }[]>`
    with deleted as (
      delete from pm_jobs
      where site_id = ${siteId}
        and visit_date = ${visitDate}::date
        and visit_time = ${visitTime}::time
      returning id
    )
    select count(*)::text as count from deleted
  `;

  return Number(rows[0]?.count ?? 0);
}

export async function updatePmJobGroup(
  siteId: string,
  visitDate: string,
  visitTime: string,
  update: Required<Pick<PmJobUpdate, "status" | "start_time" | "end_time" | "result" | "work_details">>
) {
  const sql = getSql();

  await sql`
    update pm_jobs
    set
      status = ${update.status},
      start_time = ${update.start_time},
      end_time = ${update.end_time},
      result = ${update.result},
      work_details = ${sql.json(update.work_details as never)},
      updated_at = now()
    where site_id = ${siteId}
      and visit_date = ${visitDate}::date
      and visit_time = ${visitTime}::time
  `;
}

export async function updateSiteFields(
  siteId: string,
  fields: { owner?: string; contract?: string; contract_details?: Json }
) {
  const sql = getSql();

  if (fields.owner !== undefined) {
    await sql`update sites set owner = ${fields.owner}, updated_at = now() where id = ${siteId}`;
  }

  if (fields.contract !== undefined) {
    await sql`update sites set contract = ${fields.contract}, updated_at = now() where id = ${siteId}`;
  }

  if (fields.contract_details !== undefined) {
    await sql`
      update sites
      set contract_details = ${sql.json(fields.contract_details as never)}, updated_at = now()
      where id = ${siteId}
    `;
  }
}

export async function deleteSiteById(siteId: string) {
  const sql = getSql();
  const rows = await sql<{ count: string }[]>`
    with deleted as (
      delete from sites where id = ${siteId} returning id
    )
    select count(*)::text as count from deleted
  `;

  return Number(rows[0]?.count ?? 0);
}
