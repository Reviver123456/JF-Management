import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getPmAppDataFromDb } from "@/lib/supabase/pm-queries";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      {
        message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
      },
      { status: 500 }
    );
  }

  try {
    return NextResponse.json(await getPmAppDataFromDb());
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot load PM data."
      },
      { status: 500 }
    );
  }
}
