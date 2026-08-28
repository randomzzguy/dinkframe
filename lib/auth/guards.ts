import "server-only";

import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return { claims: data.claims, supabase };
}

export function isAdminEmail(email: unknown) {
  return (
    typeof email === "string" &&
    email.toLowerCase() === getServerEnv().ADMIN_EMAIL.toLowerCase()
  );
}

export async function requireAdmin() {
  const session = await requireUser();

  if (!isAdminEmail(session.claims.email)) {
    redirect("/dashboard");
  }

  return session;
}
