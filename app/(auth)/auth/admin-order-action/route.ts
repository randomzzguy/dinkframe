import { NextResponse } from "next/server";

import { getAdminOrderActionDestination } from "@/lib/auth/admin-order-action";
import { isAdminEmail } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const destination = getAdminOrderActionDestination({
    order: requestUrl.searchParams.get("order"),
    decision: requestUrl.searchParams.get("decision"),
  });
  if (!destination) {
    return NextResponse.json(
      { error: "Invalid order action link." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    return NextResponse.redirect(
      new URL(
        isAdminEmail(data.claims.email) ? destination : "/dashboard",
        requestUrl.origin,
      ),
    );
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("next", destination);
  return NextResponse.redirect(loginUrl);
}
