"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";

export type AmendmentState = {
  status: "idle" | "success" | "error";
  message: string;
};

const amendmentSchema = z.object({
  orderId: z.uuid(),
  requestText: z.string().trim().min(2).max(3000),
});

export async function submitAmendment(
  _previousState: AmendmentState,
  formData: FormData,
): Promise<AmendmentState> {
  const parsed = amendmentSchema.safeParse({
    orderId: formData.get("orderId"),
    requestText: formData.get("requestText"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Add your requested change.",
    };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("submit_amendment", {
    target_order_id: parsed.data.orderId,
    request_body: parsed.data.requestText,
  });

  if (error || !data) {
    const errorId = randomUUID();
    console.error("submit_amendment_failed", { errorId, error });
    return {
      status: "error",
      message: `We couldn't submit that amendment. Reference: ${errorId}`,
    };
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  return {
    status: "success",
    message:
      data.billing_kind === "free"
        ? "Amendment submitted using your free allowance."
        : "Amendment submitted. DINKFRAME will confirm the additional RM10 payment.",
  };
}
