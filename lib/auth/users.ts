import { getSql } from "@/lib/db/sql";
import type { AppUserRow } from "@/lib/db/types";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function getUserByEmail(email: string) {
  const sql = getSql();
  const rows = await sql<AppUserRow[]>`
    select *
    from app_users
    where lower(email) = lower(${email})
    limit 1
  `;

  return rows[0] ?? null;
}

export async function getUserById(userId: string) {
  const sql = getSql();
  const rows = await sql<AppUserRow[]>`
    select *
    from app_users
    where id = ${userId}::uuid
    limit 1
  `;

  return rows[0] ?? null;
}

export async function verifyUserCredentials(email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.password_hash);

  return valid ? user : null;
}

export async function updateUserPassword(userId: string, password: string) {
  const sql = getSql();
  const passwordHash = await hashPassword(password);

  await sql`
    update app_users
    set
      password_hash = ${passwordHash},
      must_change_password = false,
      updated_at = now()
    where id = ${userId}::uuid
  `;
}

export async function updateUserProfile(userId: string, profile: { fullName: string; phone: string }) {
  const sql = getSql();

  await sql`
    update app_users
    set
      full_name = ${profile.fullName},
      phone = ${profile.phone},
      updated_at = now()
    where id = ${userId}::uuid
  `;
}

export async function listAppUsers() {
  const sql = getSql();
  return sql<Pick<AppUserRow, "id" | "email" | "full_name" | "phone">[]>`
    select id, email, full_name, phone
    from app_users
    order by full_name, email
  `;
}

