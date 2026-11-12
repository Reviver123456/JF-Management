import { NextResponse } from "next/server";
import { deleteSiteById, updateSiteFields } from "@/lib/db/pm-jobs";
import type { Json } from "@/lib/db/types";

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
  const updatePayload: { owner?: string; contract?: string; contract_details?: Json } = {};

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
    await updateSiteFields(siteId, updatePayload);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  try {
    const count = await deleteSiteById(siteId);

    if (count === 0) {
      return NextResponse.json({ message: "Site not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot delete site."
      },
      { status: 500 }
    );
  }
}
