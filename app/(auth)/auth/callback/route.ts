import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/auth/guards";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { getSafeNextPath } from "@/lib/auth/urls";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const next = requestUrl.searchParams.get("next");
  const safeNext = getSafeNextPath(next);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (!error) {
      let destination = safeNext;

      if (data.user) {
        if (isAdminEmail(data.user.email)) {
          destination = "/admin";
        } else {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!profileError && needsOnboarding(profile?.full_name)) {
            destination = "/onboarding";
          }
        }
      }

      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=callback", requestUrl.origin),
  );
}
