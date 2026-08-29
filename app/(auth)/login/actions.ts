"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getMagicLinkErrorMessage } from "@/lib/auth/magic-link-error";
import { getSafeNextPath } from "@/lib/auth/urls";
import { getPublicEnv } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  message: string;
  status: "idle" | "success" | "error";
};

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  next: z.string().max(1000).optional(),
});

export async function sendMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!result.success) {
    return {
      message: result.error.issues[0]?.message ?? "Check your email.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", getSafeNextPath(result.data.next));
  const { error } = await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("magic_link_send_failed", {
      code: error.code,
      status: error.status,
    });
    return {
      message: getMagicLinkErrorMessage(error),
      status: "error",
    };
  }

  return {
    message: "Check your inbox. Your secure sign-in link is on its way.",
    status: "success",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
