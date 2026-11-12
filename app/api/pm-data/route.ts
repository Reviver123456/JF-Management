import { NextResponse } from "next/server";
import { hasDatabaseConfig } from "@/lib/db/env";
import { getPmAppDataFromDb } from "@/lib/db/pm-queries";

export async function GET() {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      {
        message: "Missing DATABASE_URL."
      },
      { status: 503 }
    );
  }

  try {
    const data = await getPmAppDataFromDb();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot load PM data."
      },
      { status: 500 }
    );
  }
}
