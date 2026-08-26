"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPublicEnv } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  message: string;
  status: "idle" | "success" | "error";
};

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export async function sendMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = loginSchema.safeParse({ email: formData.get("email") });

  if (!result.success) {
    return {
      message: result.error.issues[0]?.message ?? "Check your email.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const { error } = await supabase.auth.signInWithOtp({
    email: result.data.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      message:
        "We couldn't send the sign-in link. Please wait a moment and try again.",
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
