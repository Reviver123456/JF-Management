import { NextResponse } from "next/server";
import { getNextPmOrderNos, getPmOrderNoFromWorkDetails, normalizePmOrderNo } from "@/lib/pm-order-no";
import { normalizeOwnerName } from "@/lib/pm-data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type WorkStatus = Database["public"]["Enums"]["work_status"];
type PmJobInsert = Database["public"]["Tables"]["pm_jobs"]["Insert"];
type PmJobUpdate = Database["public"]["Tables"]["pm_jobs"]["Update"];

type UpdatePmJobBody = {
  details?: unknown;
  endTime?: unknown;
  followers?: unknown;
  planUpdate?: unknown;
  pmCycle?: unknown;
  result?: unknown;
  siteId?: unknown;
  startTime?: unknown;
  status?: unknown;
  visitDate?: unknown;
  visitEndDate?: unknown;
  visitTime?: unknown;
};

function readRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function readOptionalTime(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStatus(value: unknown): WorkStatus | null {
  return value === "completed" || value === "abnormal" || value === "inProgress" || value === "pending"
    ? value
    : null;
}

function readDetails(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function readJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function uniqueNames(names: string[]) {
  const seenNames = new Set<string>();

  return names.filter((name) => {
    const normalizedName = normalizeOwnerName(name);

    if (!normalizedName || seenNames.has(normalizedName)) {
      return false;
    }

    seenNames.add(normalizedName);
    return true;
  });
}

function getMonthDateRange(dateValue: string) {
  const [yearText, monthText] = dateValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  };
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function getDateRangeValues(startValue: string, endValue: string) {
  const startDate = parseDateValue(startValue);
  const endDate = parseDateValue(endValue);

  if (!startDate || !endDate || endDate < startDate || startValue.slice(0, 7) !== endValue.slice(0, 7)) {
    return null;
  }

  const values: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    if (values.length >= 31) {
      return null;
    }

    values.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return values;
}

async function getNextJobOrderNos(supabase: ReturnType<typeof createAdminClient>, count: number) {
  const { data, error } = await supabase
    .from("pm_jobs")
    .select("id, work_details");

  if (error) {
    throw new Error(error.message);
  }

  const existingOrderNos = (data ?? []).flatMap((job) => [
    normalizePmOrderNo(job.id),
    getPmOrderNoFromWorkDetails(job.work_details)
  ]);

  return getNextPmOrderNos(existingOrderNos, count);
}

function assignPmOrderNos({
  oldOrderNo,
  oldVisitDate,
  visitDates,
  generatedOrderNos
}: {
  generatedOrderNos: string[];
  oldOrderNo: string;
  oldVisitDate: string;
  visitDates: string[];
}) {
  const preserveFirstOrderNo = Boolean(oldOrderNo && visitDates[0] === oldVisitDate);
  let generatedIndex = 0;

  return visitDates.map((date, index) => {
    if (preserveFirstOrderNo && index === 0) {
      return oldOrderNo;
    }

    const orderNo = generatedOrderNos[generatedIndex];
    generatedIndex += 1;
    return orderNo;
  });
}

function buildWorkDetails(pmOrderNo: string, oldWorkDetails: unknown): Json {
  return {
    ...readJsonObject(oldWorkDetails),
    pmOrderNo
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const body = await request.json() as UpdatePmJobBody;

    if (body.planUpdate === true) {
      const siteId = readRequiredString(body.siteId);
      const visitDate = readRequiredString(body.visitDate);
      const visitEndDate = readRequiredString(body.visitEndDate) || visitDate;
      const visitTime = readRequiredString(body.visitTime);
      const followers = readStringList(body.followers);

      if (!siteId || !visitDate || !visitTime) {
        return NextResponse.json({ message: "Missing site, date, or time." }, { status: 400 });
      }

      const visitDates = getDateRangeValues(visitDate, visitEndDate);
      const monthRange = getMonthDateRange(visitDate);

      if (!visitDates || !monthRange) {
        return NextResponse.json({ message: "Invalid date range." }, { status: 400 });
      }

      const supabase = createAdminClient();
      const { data: oldJob, error: oldJobError } = await supabase
        .from("pm_jobs")
        .select("site_id, visit_date, visit_time, pm_cycle, work_details")
        .eq("id", jobId)
        .maybeSingle();

      if (oldJobError) {
        throw new Error(oldJobError.message);
      }

      if (!oldJob) {
        return NextResponse.json({ message: "PM job not found." }, { status: 404 });
      }

      const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("id, owner")
        .eq("id", siteId)
        .maybeSingle();

      if (siteError) {
        throw new Error(siteError.message);
      }

      if (!site) {
        return NextResponse.json({ message: "Site not found." }, { status: 404 });
      }

      const { data: existingJobs, error: existingJobError } = await supabase
        .from("pm_jobs")
        .select("id, site_id, visit_date, visit_time")
        .eq("site_id", site.id)
        .gte("visit_date", monthRange.start)
        .lt("visit_date", monthRange.end);

      if (existingJobError) {
        throw new Error(existingJobError.message);
      }

      const hasConflict = (existingJobs ?? []).some((job) => (
        job.site_id !== oldJob.site_id || job.visit_date !== oldJob.visit_date || job.visit_time !== oldJob.visit_time
      ));

      if (hasConflict) {
        return NextResponse.json({ message: "This site already has a PM job this month." }, { status: 409 });
      }

      const participants = uniqueNames([site.owner, ...followers]);

      if (participants.length === 0) {
        return NextResponse.json({ message: "Please assign a site owner or follower." }, { status: 400 });
      }

      const { error: deleteError } = await supabase
        .from("pm_jobs")
        .delete()
        .eq("site_id", oldJob.site_id)
        .eq("visit_date", oldJob.visit_date)
        .eq("visit_time", oldJob.visit_time);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      const pmCycle = readRequiredString(body.pmCycle) || oldJob.pm_cycle || "semi annual";
      const oldOrderNo = getPmOrderNoFromWorkDetails(oldJob.work_details);
      const generatedOrderCount = visitDates.length - (oldOrderNo && visitDates[0] === oldJob.visit_date ? 1 : 0);
      const generatedOrderNos = await getNextJobOrderNos(supabase, generatedOrderCount);
      const pmOrderNos = assignPmOrderNos({
        generatedOrderNos,
        oldOrderNo,
        oldVisitDate: oldJob.visit_date,
        visitDates
      });
      const rows: PmJobInsert[] = visitDates.flatMap((date, dateIndex) => participants.map((owner) => ({
        id: `PM-${crypto.randomUUID()}`,
        site_id: site.id,
        status: "pending",
        pm_cycle: pmCycle,
        visit_date: date,
        visit_time: visitTime,
        owner,
        work_details: buildWorkDetails(pmOrderNos[dateIndex], oldJob.work_details)
      })));

      const { error: insertError } = await supabase.from("pm_jobs").insert(rows);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return NextResponse.json({ ok: true, jobsCount: rows.length });
    }

    const status = readStatus(body.status);

    if (!status) {
      return NextResponse.json({ message: "Invalid PM job status." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: job, error: jobError } = await supabase
      .from("pm_jobs")
      .select("site_id, visit_date, visit_time")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      throw new Error(jobError.message);
    }

    if (!job) {
      return NextResponse.json({ message: "PM job not found." }, { status: 404 });
    }

    const result = typeof body.result === "string" && body.result.trim() ? body.result.trim() : null;
    const updatePayload: PmJobUpdate = {
      status,
      start_time: readOptionalTime(body.startTime),
      end_time: readOptionalTime(body.endTime),
      result,
      work_details: readDetails(body.details)
    };

    const { error } = await supabase
      .from("pm_jobs")
      .update(updatePayload)
      .eq("site_id", job.site_id)
      .eq("visit_date", job.visit_date)
      .eq("visit_time", job.visit_time);

    if (error) {
      if (error.message.includes("work_details")) {
        throw new Error("Missing pm_jobs.work_details column. Run: alter table public.pm_jobs add column if not exists work_details jsonb not null default '{}'::jsonb;");
      }

      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot update PM job."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const supabase = createAdminClient();
    const { data: job, error: jobError } = await supabase
      .from("pm_jobs")
      .select("site_id, visit_date, visit_time")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      throw new Error(jobError.message);
    }

    if (!job) {
      return NextResponse.json({ message: "PM job not found." }, { status: 404 });
    }

    const { count, error } = await supabase
      .from("pm_jobs")
      .delete({ count: "exact" })
      .eq("site_id", job.site_id)
      .eq("visit_date", job.visit_date)
      .eq("visit_time", job.visit_time);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, jobsCount: count ?? 0 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot delete PM job."
      },
      { status: 500 }
    );
  }
}
