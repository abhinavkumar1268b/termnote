import { NextResponse } from "next/server";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const siteUrl = getSiteUrl();

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${siteUrl}/login?error=confirm`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${siteUrl}/login?error=confirm`);
  }

  const destination = type === "reset" ? "/reset-password" : "/";
  return NextResponse.redirect(`${siteUrl}${destination}`);
}
