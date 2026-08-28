"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { profileDetailsSchema } from "@/lib/validation/profile";

export type OnboardingActionState = {
  status: "idle" | "error";
  message: string;
};

export async function completeOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = profileDetailsSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    instagramHandle: formData.get("instagramHandle") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your profile details.",
    };
  }

  const { claims, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp ?? null,
      instagram_handle: parsed.data.instagramHandle ?? null,
    })
    .eq("id", claims.sub)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    const errorId = randomUUID();
    console.error("onboarding_profile_update_failed", { errorId, error });
    return {
      status: "error",
      message: `We couldn't save your profile. Reference: ${errorId}`,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/orders/new");
  redirect("/dashboard");
}
