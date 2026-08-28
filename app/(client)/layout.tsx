import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { needsOnboarding } from "@/lib/auth/onboarding";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { claims, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) {
    throw new Error("We couldn't load your profile.");
  }

  if (needsOnboarding(profile?.full_name)) {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}
