import { type NextRequest, NextResponse } from "next/server";

import { getCrossDomainLoginRedirect } from "@/lib/auth/urls";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const loginRedirect = getCrossDomainLoginRedirect(
    request.nextUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  if (loginRedirect) {
    return NextResponse.redirect(loginRedirect);
  }

  if (
    request.nextUrl.hostname === "app.dinkframe.my" &&
    request.nextUrl.pathname === "/"
  ) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
