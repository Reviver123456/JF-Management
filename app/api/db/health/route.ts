import { NextResponse } from "next/server";
import { hasDatabaseConfig } from "@/lib/db/env";
import { getSql } from "@/lib/db/sql";

export async function GET() {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing DATABASE_URL."
      },
      { status: 503 }
    );
  }

  try {
    const sql = getSql();
    const rows = await sql<{ count: string }[]>`select count(*)::text as count from sites`;
    const count = Number(rows[0]?.count ?? 0);

    return NextResponse.json({ ok: true, sitesCount: count });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Database check failed."
      },
      { status: 500 }
    );
  }
}
