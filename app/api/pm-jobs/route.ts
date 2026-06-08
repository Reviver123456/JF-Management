import { NextResponse } from "next/server";
import { normalizeOwnerName } from "@/lib/pm-data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type PmJobInsert = Database["public"]["Tables"]["pm_jobs"]["Insert"];

type CreatePmJobBody = {
  followers?: unknown;
  pmCycle?: unknown;
  siteId?: unknown;
  visitDate?: unknown;
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

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreatePmJobBody;
    const siteId = readRequiredString(body.siteId);
    const visitDate = readRequiredString(body.visitDate);
    const visitTime = readRequiredString(body.visitTime);
    const pmCycle = readRequiredString(body.pmCycle) || "semi annual";
    const followers = readStringList(body.followers);

    if (!siteId || !visitDate || !visitTime) {
      return NextResponse.json({ message: "Missing site, date, or time." }, { status: 400 });
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

    const participants = uniqueNames([site.owner, ...followers]);

    if (participants.length === 0) {
      return NextResponse.json({ message: "Please assign a site owner or follower." }, { status: 400 });
    }

    const rows: PmJobInsert[] = participants.map((owner) => ({
      id: `PM-${crypto.randomUUID()}`,
      site_id: site.id,
      status: "pending",
      pm_cycle: pmCycle,
      visit_date: visitDate,
      visit_time: visitTime,
      owner
    }));

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
