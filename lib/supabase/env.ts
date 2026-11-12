const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseConfigMessage(lang: "th" | "en" = "th") {
  return lang === "th"
    ? "ยังไม่ได้ตั้งค่า Supabase กรุณาใส่ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน environment แล้วรีสตาร์ทแอป"
    : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment, then restart the app.";
}

export function getSupabaseConfig() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(getSupabaseConfigMessage("en"));
  }

  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey
  };
}
