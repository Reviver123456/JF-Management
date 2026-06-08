import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { count, error } = await supabase.from("sites").select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    sitesCount: count ?? 0,
    checkedAt: new Date().toISOString()
  });
}
