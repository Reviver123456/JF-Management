import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildUserAccessPayload,
  defaultStatusForUser,
  type UserAccessRecord,
  type UserAccessStatus
} from "@/lib/auth/user-access";

async function readExistingAccess(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_access")
    .select("user_id, email, full_name, avatar_url, openid_sub, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserAccessRecord | null;
}

export async function syncUserAccessForSession(user: User): Promise<UserAccessRecord> {
  const admin = createAdminClient();
  const existing = await readExistingAccess(user.id);
  const profilePayload = buildUserAccessPayload(
    user,
    existing?.status ?? defaultStatusForUser(user)
  );

  if (!profilePayload.email) {
    throw new Error("Signed-in user has no email.");
  }

  const status: UserAccessStatus = existing?.status ?? defaultStatusForUser(user);

  const row: UserAccessRecord = {
    ...profilePayload,
    status
  };

  const { error } = await admin.from("user_access").upsert(
    {
      user_id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      openid_sub: row.openid_sub,
      status: row.status
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return row;
}

export async function getUserAccessStatus(userId: string): Promise<UserAccessStatus | null> {
  const existing = await readExistingAccess(userId);
  return existing?.status ?? null;
}

export function canEnterApp(status: UserAccessStatus | null) {
  return status === "approved";
}