"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";

export type PaymentSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const paymentSettingsSchema = z
  .object({
    bankName: z.string().trim().max(120).optional(),
    accountName: z.string().trim().max(120).optional(),
    accountNumber: z.string().trim().max(80).optional(),
    duitnowId: z.string().trim().max(120).optional(),
    instructions: z.string().trim().max(1500).optional(),
  })
  .refine((value) => value.bankName || value.duitnowId, {
    message: "Add bank or DuitNow details.",
  });

const allowedQrTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function updatePaymentSettings(
  _previousState: PaymentSettingsActionState,
  formData: FormData,
): Promise<PaymentSettingsActionState> {
  const parsed = paymentSettingsSchema.safeParse({
    bankName: textOrUndefined(formData.get("bankName")),
    accountName: textOrUndefined(formData.get("accountName")),
    accountNumber: textOrUndefined(formData.get("accountNumber")),
    duitnowId: textOrUndefined(formData.get("duitnowId")),
    instructions: textOrUndefined(formData.get("instructions")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the payment details.",
    };
  }

  const { claims, supabase } = await requireAdmin();
  const qrFile = formData.get("paymentQr");
  let qrImagePath: string | undefined;

  if (qrFile instanceof File && qrFile.size > 0) {
    if (!allowedQrTypes.has(qrFile.type) || qrFile.size > 5 * 1024 * 1024) {
      return {
        status: "error",
        message: "Use a JPG, PNG, or WebP QR image no larger than 5 MB.",
      };
    }

    qrImagePath = "settings/payment-qr";
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(qrImagePath, qrFile, {
        contentType: qrFile.type,
        upsert: true,
      });

    if (uploadError)
      return settingsError("payment_qr_upload_failed", uploadError);
  }

  const values = parsed.data;
  const { error } = await supabase.from("payment_settings").upsert({
    id: true,
    bank_name: values.bankName ?? null,
    account_name: values.accountName ?? null,
    account_number: values.accountNumber ?? null,
    duitnow_id: values.duitnowId ?? null,
    instructions: values.instructions ?? null,
    ...(qrImagePath ? { qr_image_path: qrImagePath } : {}),
    updated_by: typeof claims.sub === "string" ? claims.sub : null,
    updated_at: new Date().toISOString(),
  });

  if (error) return settingsError("payment_settings_update_failed", error);

  revalidatePath("/admin/settings");
  revalidatePath("/orders/new");
  return { status: "success", message: "Payment instructions saved." };
}

function textOrUndefined(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function settingsError(
  event: string,
  error: unknown,
): PaymentSettingsActionState {
  const errorId = randomUUID();
  console.error(event, { errorId, error });
  return {
    status: "error",
    message: `We couldn't save the settings. Reference: ${errorId}`,
  };
}
