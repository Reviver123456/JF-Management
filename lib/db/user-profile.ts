import { getSql } from "@/lib/db/sql";

export async function getUserSignature(userId: string) {
  const sql = getSql();
  const rows = await sql<{ signature: string }[]>`
    select signature
    from user_profiles
    where user_id = ${userId}::uuid
    limit 1
  `;

  return rows[0]?.signature ?? "";
}

export async function saveUserSignature(userId: string, signature: string) {
  const sql = getSql();

  await sql`
  insert into user_profiles (user_id, signature)
  values (${userId}::uuid, ${signature})
  on conflict (user_id) do update
  set signature = excluded.signature, updated_at = now()
  `;
}
