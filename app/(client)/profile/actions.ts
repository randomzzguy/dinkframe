"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().min(8).max(30),
  instagramHandle: z.string().trim().max(80).optional(),
});

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    whatsapp: formData.get("whatsapp"),
    instagramHandle: formData.get("instagramHandle") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your profile details.",
    };
  }

  const { claims, supabase } = await requireUser();
  const userId = typeof claims.sub === "string" ? claims.sub : "";
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp,
      instagram_handle: parsed.data.instagramHandle?.replace(/^@+/, "") || null,
    })
    .eq("id", userId);

  if (error) {
    const errorId = randomUUID();
    console.error("profile_update_failed", { errorId, error });
    return {
      status: "error",
      message: `We couldn't save your profile. Reference: ${errorId}`,
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/orders/new");
  return { status: "success", message: "Profile saved." };
}
