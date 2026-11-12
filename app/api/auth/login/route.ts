import { NextResponse } from "next/server";
import { attachSessionCookie, createSessionToken } from "@/lib/auth/session";
import { verifyUserCredentials } from "@/lib/auth/users";
import { hasDatabaseConfig } from "@/lib/db/env";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!hasDatabaseConfig()) {
    return NextResponse.json({ ok: false, message: "Missing DATABASE_URL." }, { status: 503 });
  }

  try {
    const { email, password } = await request.json() as LoginBody;
    const normalizedEmail = email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail || !password) {
      return NextResponse.json({ ok: false, message: "Please enter email and password." }, { status: 400 });
    }

    const user = await verifyUserCredentials(normalizedEmail, password);

    if (!user) {
      return NextResponse.json({
        ok: false,
        code: "invalid_credentials",
        message: "Incorrect email or password."
      }, { status: 401 });
    }

    const sessionToken = await createSessionToken(user.id, user.email);
    const response = NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        fullName: user.full_name,
        id: user.id,
        mustChangePassword: user.must_change_password,
        phone: user.phone
      }
    });
    attachSessionCookie(response, sessionToken);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot sign in."
      },
      { status: 500 }
    );
  }
}
