import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/auth/users";

type ProfileBody = {
  fullName?: string;
  phone?: string;
};

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { fullName, phone } = await request.json() as ProfileBody;

    if (typeof fullName !== "string" || typeof phone !== "string") {
      return NextResponse.json({ ok: false, message: "Invalid profile payload." }, { status: 400 });
    }

    await updateUserProfile(session.id, {
      fullName: fullName.trim(),
      phone: phone.trim()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot update profile."
      },
      { status: 500 }
    );
  }
}
