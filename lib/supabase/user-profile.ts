import { createClient } from "@/lib/supabase/server";

export async function getUserSignature(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("signature")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.signature ?? "";
}

export async function saveUserSignature(userId: string, signature: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        signature
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw new Error(error.message);
  }
}
