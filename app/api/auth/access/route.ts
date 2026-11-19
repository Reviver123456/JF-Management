import { NextResponse } from "next/server";

import { canEnterApp, syncUserAccessForSession } from "@/lib/auth/sync-user-access-server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { data, error: accessError } = await supabase
      .from("user_access")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (accessError) {
      throw new Error(accessError.message);
    }

    const status = data?.status ?? null;

    return NextResponse.json({
      ok: true,
      status,
      allowed: canEnterApp(status)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot read access status."
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const access = await syncUserAccessForSession(user);

    return NextResponse.json({
      ok: true,
      status: access.status,
      allowed: canEnterApp(access.status)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot sync access record."
      },
      { status: 500 }
    );
  }
}