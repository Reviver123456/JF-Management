import { NextResponse } from "next/server";
import { hasGoogleOAuthConfig } from "@/lib/auth/google-oauth";

export async function GET() {
  return NextResponse.json({ enabled: hasGoogleOAuthConfig() });
}
