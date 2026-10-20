"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPostLoginDestination } from "@/lib/auth/post-login";
import { getSafeNextPathFromAuthRedirect } from "@/lib/auth/urls";
import { getPublicEnv } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

const confirmationSchema = z.object({
  tokenHash: z
    .string()
    .trim()
    .min(20)
    .max(1024)
    .regex(/^[A-Za-z0-9_-]+$/),
  redirectTo: z.string().trim().max(2000).optional(),
});

export async function confirmMagicLink(formData: FormData) {
  const result = confirmationSchema.safeParse({
    tokenHash: formData.get("token_hash"),
    redirectTo: formData.get("redirect_to") || undefined,
  });
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const nextPath = getSafeNextPathFromAuthRedirect(
    result.success ? result.data.redirectTo : undefined,
    appUrl,
  );

  if (!result.success) {
    redirect(buildCallbackErrorPath(nextPath));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: result.data.tokenHash,
    type: "email",
  });

  if (error || !data.user) {
    redirect(buildCallbackErrorPath(nextPath));
  }

  const destination = await getPostLoginDestination({
    supabase,
    user: data.user,
    next: nextPath,
  });
  redirect(destination);
}

function buildCallbackErrorPath(nextPath: string) {
  const query = new URLSearchParams({ error: "callback", next: nextPath });
  return `/login?${query.toString()}`;
}
