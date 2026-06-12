import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfig } from "@/lib/supabase/env";

type ChangePasswordPayload = {
  currentPassword?: string;
  email?: string;
  newPassword?: string;
};

function createPasswordVerifyClient() {
  const { publishableKey, url } = getSupabaseConfig();

  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: Request) {
  try {
    const { currentPassword, email, newPassword } = await request.json() as ChangePasswordPayload;
    const normalizedEmail = email?.trim().toLowerCase() ?? "";

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

    const verifyClient = createPasswordVerifyClient();
    const { data: verifiedLogin, error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: normalizedEmail,
      password: currentPassword
    });

    if (verifyError || !verifiedLogin.user) {
      return NextResponse.json(
        { ok: false, message: verifyError?.message ?? "Current password is incorrect." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(verifiedLogin.user.id, {
      password: newPassword,
      user_metadata: {
        ...verifiedLogin.user.user_metadata,
        must_change_password: false
      }
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

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
