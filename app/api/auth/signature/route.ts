import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getUserSignature, saveUserSignature } from "@/lib/db/user-profile";

type SignaturePayload = {
  signature?: string;
};

export async function GET() {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const signature = await getUserSignature(session.id);
    return NextResponse.json({ ok: true, signature });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot load signature."
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { signature } = await request.json() as SignaturePayload;

    if (typeof signature !== "string") {
      return NextResponse.json({ ok: false, message: "Invalid signature payload." }, { status: 400 });
    }

    await saveUserSignature(session.id, signature);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot save signature."
      },
      { status: 500 }
    );
  }
}
