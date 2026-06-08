import { NextResponse } from "next/server";
import { defaultLoginUsers } from "@/lib/auth/default-user";
import { createAdminClient } from "@/lib/supabase/admin";

const existingUserMessages = ["already registered", "already been registered", "user already exists"];

function isExistingUserError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return existingUserMessages.some((item) => normalizedMessage.includes(item));
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const url = new URL(request.url);
    const shouldResetPassword = url.searchParams.get("resetPassword") === "1";
    const results = [];
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(listError.message);
    }

    for (const loginUser of defaultLoginUsers) {
      const userMetadata = {
        full_name: loginUser.name,
        phone: loginUser.phone,
        must_change_password: true
      };
      const existingUser = users.users.find((user) => user.email?.toLowerCase() === loginUser.email.toLowerCase());

      if (!existingUser) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: loginUser.email,
          password: loginUser.password,
          email_confirm: true,
          user_metadata: userMetadata
        });

        if (error && !isExistingUserError(error.message)) {
          throw new Error(error.message);
        }

        results.push({
          email: data.user?.email ?? loginUser.email,
          created: !error,
          passwordReset: false
        });

        continue;
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        ...(shouldResetPassword ? { password: loginUser.password } : {}),
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          ...userMetadata
        }
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      results.push({
        email: existingUser.email,
        created: false,
        passwordReset: shouldResetPassword
      });
    }

    return NextResponse.json({
      ok: true,
      users: results
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cannot create default login user."
      },
      { status: 500 }
    );
  }
}
