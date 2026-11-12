import { getSql } from "@/lib/db/sql";
import type { Json } from "@/lib/db/types";
import { getNextPmOrderNos, getPmOrderNoFromWorkDetails, normalizePmOrderNo } from "@/lib/pm-order-no";

export async function getNextJobOrderNos(count: number) {
  const sql = getSql();
  const data = await sql<{ id: string; work_details: Json }[]>`
    select id, work_details
    from pm_jobs
  `;

  const existingOrderNos = data.flatMap((job) => [
    normalizePmOrderNo(job.id),
    getPmOrderNoFromWorkDetails(job.work_details)
  ]);

  return getNextPmOrderNos(existingOrderNos, count);
}
