import { NextResponse } from "next/server";
import type { SystemUser } from "@/lib/auth/system-users";
import { listAppUsers } from "@/lib/auth/users";

export async function GET() {
  try {
    const data = await listAppUsers();

    const users: SystemUser[] = data
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.full_name.trim() || user.email,
        phone: user.phone
      }))
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
