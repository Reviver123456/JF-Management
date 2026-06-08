import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type WorkStatus = Database["public"]["Enums"]["work_status"];
type PmJobUpdate = Database["public"]["Tables"]["pm_jobs"]["Update"];

type UpdatePmJobBody = {
  details?: unknown;
  endTime?: unknown;
  result?: unknown;
  startTime?: unknown;
  status?: unknown;
};

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const body = await request.json() as UpdatePmJobBody;
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
