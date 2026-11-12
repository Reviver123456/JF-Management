import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { updateUserPassword, verifyUserCredentials } from "@/lib/auth/users";

type ChangePasswordPayload = {
  currentPassword?: string;
  email?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    const { currentPassword, email, newPassword } = await request.json() as ChangePasswordPayload;
    const session = await getSessionFromCookies();
    const normalizedEmail = (email?.trim().toLowerCase() || session?.email || "");

    if (!normalizedEmail || !currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, message: "Please fill in current and new password." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, message: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const user = await verifyUserCredentials(normalizedEmail, currentPassword);

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Current password is incorrect." },
        { status: 401 }
      );
    }

  await updateUserPassword(user.id, newPassword);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot change password."
      },
      { status: 500 }
    );
  }
}
