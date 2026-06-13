import { NextResponse } from "next/server";
import { getUserSignature, saveUserSignature } from "@/lib/supabase/user-profile";
import { createClient } from "@/lib/supabase/server";

type SignaturePayload = {
  signature?: string;
};

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

    const signature = await getUserSignature(user.id);
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
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { signature } = await request.json() as SignaturePayload;

    if (typeof signature !== "string") {
      return NextResponse.json({ ok: false, message: "Invalid signature payload." }, { status: 400 });
    }

    await saveUserSignature(user.id, signature);
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
