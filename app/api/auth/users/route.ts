import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SystemUser } from "@/lib/auth/system-users";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (error) {
      throw new Error(error.message);
    }

    const users: SystemUser[] = data.users
      .map((user) => {
        const metadata = user.user_metadata ?? {};
        const name = typeof metadata.full_name === "string" && metadata.full_name.trim()
          ? metadata.full_name
          : user.email ?? "Unknown user";

        return {
          id: user.id,
          email: user.email ?? "",
          name,
          phone: typeof metadata.phone === "string" ? metadata.phone : ""
        };
      })
      .filter((user) => user.email)
      .sort((first, second) => first.name.localeCompare(second.name));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Cannot load system users."
      },
      { status: 500 }
    );
  }
}
