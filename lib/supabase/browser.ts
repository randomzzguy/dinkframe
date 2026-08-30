"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/config/env";
import { getSharedAuthCookieOptions } from "@/lib/auth/cookies";
import type { Database } from "@/lib/types/database";

export function createClient() {
  const env = getPublicEnv();

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: getSharedAuthCookieOptions(window.location.hostname),
    },
  );
}
