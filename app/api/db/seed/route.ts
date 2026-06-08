import { NextResponse } from "next/server";
import { pmJobs, siteCatalog } from "@/lib/mock-data";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

type SiteInsert = Database["public"]["Tables"]["sites"]["Insert"];
type PmJobInsert = Database["public"]["Tables"]["pm_jobs"]["Insert"];

function toSiteInsert(site: (typeof siteCatalog)[number]): SiteInsert {
  return {
    id: site.id,
    site: site.site,
    customer: site.customer,
    contact: site.contact,
    phone: site.phone,
    province: site.province,
    region: site.region,
    owner: site.owner,
    contract: site.contract,
    address: site.address,
    department: site.department,
    email: site.email
  };
}

function toPmJobInsert(job: (typeof pmJobs)[number]): PmJobInsert {
  return {
    id: job.id,
    site_id: job.siteId,
    status: job.status,
    pm_cycle: job.pmCycle,
    visit_date: job.visitDate,
    visit_time: job.visitTime,
    owner: job.owner,
    start_time: job.startTime ?? null,
    end_time: job.endTime ?? null,
    result: job.result ?? null
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const seedToken = process.env.SUPABASE_SEED_TOKEN;
    const requestToken = request.headers.get("x-seed-token");

    if (!seedToken || requestToken !== seedToken) {
      return NextResponse.json({ message: "Seed route is locked in production." }, { status: 403 });
    }
  }

  try {
    const supabase = createAdminClient();
    const { error: sitesError } = await supabase.from("sites").upsert(siteCatalog.map(toSiteInsert), { onConflict: "id" });

    if (sitesError) {
      throw new Error(sitesError.message);
    }

    const { error: jobsError } = await supabase.from("pm_jobs").upsert(pmJobs.map(toPmJobInsert), { onConflict: "id" });

    if (jobsError) {
      throw new Error(jobsError.message);
    }

    return NextResponse.json({
      ok: true,
      sitesCount: siteCatalog.length,
      pmJobsCount: pmJobs.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot seed Supabase."
      },
      { status: 500 }
    );
  }
}
