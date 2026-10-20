import { NextResponse } from "next/server";

import { getPostLoginDestination } from "@/lib/auth/post-login";
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
      const destination = data.user
        ? await getPostLoginDestination({
            supabase,
            user: data.user,
            next: safeNext,
          })
        : safeNext;

      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=callback", requestUrl.origin),
  );
}
