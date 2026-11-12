import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getUserById } from "@/lib/auth/users";
import { hasDatabaseConfig } from "@/lib/db/env";

export async function GET() {
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ ok: false, message: "Missing DATABASE_URL." }, { status: 503 });
  }

  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const user = await getUserById(session.id);

    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        mustChangePassword: user.must_change_password
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot load session."
      },
      { status: 500 }
    );
  }
}
