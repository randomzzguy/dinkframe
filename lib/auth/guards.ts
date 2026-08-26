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

export async function requireAdmin() {
  const session = await requireUser();
  const adminEmail = getServerEnv().ADMIN_EMAIL.toLowerCase();
  const email =
    typeof session.claims.email === "string"
      ? session.claims.email.toLowerCase()
      : "";

  if (email !== adminEmail) {
    redirect("/dashboard");
  }

  return session;
}
