import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/auth/guards";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { getAdminPostLoginPath, getSafeNextPath } from "@/lib/auth/urls";
import type { Database } from "@/lib/types/database";

export async function getPostLoginDestination({
  supabase,
  user,
  next,
}: {
  supabase: SupabaseClient<Database>;
  user: User;
  next: string | string[] | null | undefined;
}) {
  const safeNext = getSafeNextPath(next);

  if (isAdminEmail(user.email)) {
    return getAdminPostLoginPath(safeNext);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return !error && needsOnboarding(profile?.full_name)
    ? "/onboarding"
    : safeNext;
}
