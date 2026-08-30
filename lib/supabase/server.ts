import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { getSharedAuthCookieOptions } from "@/lib/auth/cookies";
import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const env = getPublicEnv();
  const cookieOptions = getSharedAuthCookieOptions(headerStore.get("host"));

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...cookieOptions,
              }),
            );
          } catch {
            // Server Components cannot write cookies. The request proxy refreshes them.
          }
        },
      },
    },
  );
}
