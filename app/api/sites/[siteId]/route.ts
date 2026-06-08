import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const body = await request.json() as { owner?: unknown };
  const owner = typeof body.owner === "string" ? body.owner : "";

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("sites")
      .update({ owner })
      .eq("id", siteId);

    if (error) {
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
