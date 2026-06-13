import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const metadata = user.user_metadata ?? {};
    if (typeof metadata.signature !== "string") {
      return NextResponse.json({ ok: true, changed: false });
    }

    const { signature: _removedSignature, ...metadataWithoutSignature } = metadata;
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadataWithoutSignature,
        signature: null
      }
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    await supabase.auth.refreshSession();

    return NextResponse.json({ ok: true, changed: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot clean up user metadata."
      },
      { status: 500 }
    );
  }
}
