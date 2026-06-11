import { NextResponse } from "next/server";
import { normalizeOwnerName } from "@/lib/pm-data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type PmJobInsert = Database["public"]["Tables"]["pm_jobs"]["Insert"];

type CreatePmJobBody = {
  expenses?: unknown;
  followers?: unknown;
  pmCycle?: unknown;
  siteId?: unknown;
  visitDate?: unknown;
  visitEndDate?: unknown;
  visitTime?: unknown;
};

const expenseKeys = new Set(["carRental", "fuel", "general", "lodging", "other", "toll"]);

function readRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function readExpenseDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((details, [key, item]) => {
    if (expenseKeys.has(key) && typeof item === "string" && item.trim()) {
      details[key] = item.trim();
    }

    return details;
  }, {});
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

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreatePmJobBody;
    const siteId = readRequiredString(body.siteId);
    const visitDate = readRequiredString(body.visitDate);
    const visitEndDate = readRequiredString(body.visitEndDate) || visitDate;
    const visitTime = readRequiredString(body.visitTime);
    const pmCycle = readRequiredString(body.pmCycle) || "semi annual";
    const followers = readStringList(body.followers);
    const expenses = readExpenseDetails(body.expenses);

    if (!siteId || !visitDate || !visitTime) {
      return NextResponse.json({ message: "Missing site, date, or time." }, { status: 400 });
    }

    const visitDates = getDateRangeValues(visitDate, visitEndDate);

    if (!visitDates) {
      return NextResponse.json({ message: "Invalid date range." }, { status: 400 });
    }

    const supabase = createAdminClient();
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

    const monthRange = getMonthDateRange(visitDate);

    if (!monthRange) {
      return NextResponse.json({ message: "Invalid visit date." }, { status: 400 });
    }

    const { data: existingJob, error: existingJobError } = await supabase
      .from("pm_jobs")
      .select("id")
      .eq("site_id", site.id)
      .gte("visit_date", monthRange.start)
      .lt("visit_date", monthRange.end)
      .limit(1)
      .maybeSingle();

    if (existingJobError) {
      throw new Error(existingJobError.message);
    }

    if (existingJob) {
      return NextResponse.json({ message: "This site already has a PM job this month." }, { status: 409 });
    }

    const participants = uniqueNames([site.owner, ...followers]);

    if (participants.length === 0) {
      return NextResponse.json({ message: "Please assign a site owner or follower." }, { status: 400 });
    }

    const workDetails: Json | undefined = Object.keys(expenses).length > 0 ? { expenses } : undefined;
    const rows: PmJobInsert[] = visitDates.flatMap((date) => participants.map((owner) => ({
      id: `PM-${crypto.randomUUID()}`,
      site_id: site.id,
      status: "pending",
      pm_cycle: pmCycle,
      visit_date: date,
      visit_time: visitTime,
      owner,
      ...(workDetails ? { work_details: workDetails } : {})
    })));

    const { error } = await supabase.from("pm_jobs").insert(rows);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, jobsCount: rows.length });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot create PM job."
      },
      { status: 500 }
    );
  }
}
