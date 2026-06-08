import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type SiteUpdate = Database["public"]["Tables"]["sites"]["Update"];

type UpdateSiteBody = {
  contract?: unknown;
  contractDetails?: unknown;
  owner?: unknown;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readJsonObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const body = await request.json() as UpdateSiteBody;
  const updatePayload: SiteUpdate = {};

  if ("owner" in body) {
    updatePayload.owner = readOptionalString(body.owner);
  }

  if ("contract" in body) {
    updatePayload.contract = readOptionalString(body.contract);
  }

  if ("contractDetails" in body) {
    updatePayload.contract_details = readJsonObject(body.contractDetails);
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("sites")
      .update(updatePayload)
      .eq("id", siteId);

    if (error) {
      if (error.message.includes("contract_details")) {
        throw new Error("Missing sites.contract_details column. Run: alter table public.sites add column if not exists contract_details jsonb not null default '{}'::jsonb;");
      }

      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot update site."
      },
      { status: 500 }
    );
  }
}
