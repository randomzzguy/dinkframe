"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import type { Json } from "@/lib/types/database";
import {
  orderSubmissionSchema,
  type OrderSubmissionInput,
} from "@/lib/validation/order";

export type PrepareDraftResult =
  | { ok: true; draftId: string; reused: boolean }
  | { ok: false; message: string };

export type SubmitOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; message: string; errorId?: string };

const draftIdSchema = z.uuid();

export async function prepareOrderDraft(
  existingDraftId?: string,
): Promise<PrepareDraftResult> {
  const { claims, supabase } = await requireUser();

  if (existingDraftId && draftIdSchema.safeParse(existingDraftId).success) {
    const { data: existing } = await supabase
      .from("order_drafts")
      .select("id")
      .eq("id", existingDraftId)
      .eq("client_id", claims.sub)
      .maybeSingle();

    if (existing) {
      return { ok: true, draftId: existing.id, reused: true };
    }
  }

  const { data, error } = await supabase
    .from("order_drafts")
    .insert({ client_id: claims.sub })
    .select("id")
    .single();

  if (error) {
    const errorId = randomUUID();
    console.error("prepare_order_draft_failed", { errorId, error });
    return {
      ok: false,
      message: "We couldn't prepare your order yet. Please try again.",
    };
  }

  return { ok: true, draftId: data.id, reused: false };
}

export async function submitOrder(
  input: OrderSubmissionInput,
): Promise<SubmitOrderResult> {
  const parsed = orderSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Please review the order information and try again.",
    };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("submit_order_from_draft", {
    target_draft_id: parsed.data.draftId,
    order_payload: parsed.data.order as unknown as Json,
    asset_payload: parsed.data.assets as unknown as Json,
  });

  if (error) {
    const errorId = randomUUID();
    console.error("submit_order_failed", { errorId, error });
    return {
      ok: false,
      message: friendlySubmissionError(error.message),
      errorId,
    };
  }

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.id !== "string" ||
    typeof data.orderNumber !== "string"
  ) {
    const errorId = randomUUID();
    console.error("submit_order_invalid_response", { errorId, data });
    return {
      ok: false,
      message: "Your order could not be confirmed. Please try again.",
      errorId,
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, orderId: data.id, orderNumber: data.orderNumber };
}

function friendlySubmissionError(message: string): string {
  const safeMessages = [
    "Order draft not found",
    "Selected package is unavailable",
    "Required order information is incomplete",
    "Tournament dates are invalid",
    "At least one event is required",
    "Sponsor information is invalid",
    "Upload between two and eight player photos",
    "Exactly one payment proof is required",
    "Exactly one tournament logo is required",
    "Upload no more than ten sponsor logos",
    "One or more uploaded assets could not be verified",
  ];

  return (
    safeMessages.find((safeMessage) => message.includes(safeMessage)) ??
    "We couldn't submit your order. Please review the form and try again."
  );
}
