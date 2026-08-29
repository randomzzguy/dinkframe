"use client";

import { CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import {
  changePaymentStatus,
  type AdminActionState,
} from "@/app/admin/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status";
import type { OrderStatus, PaymentStatus } from "@/lib/types/domain";

const initialState: AdminActionState = { status: "idle", message: "" };

export function OrderControls({
  orderId,
  currentStatus,
  currentPaymentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  currentPaymentStatus: PaymentStatus;
}) {
  const [paymentState, paymentAction, paymentPending] = useActionState(
    changePaymentStatus,
    initialState,
  );
  const paymentConfirmed = currentPaymentStatus === "confirmed";

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Production control</p>
          <h2 className="mt-2 text-xl font-bold">One action, one workflow</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Confirm payment once. Publishing a review or final poster will move
            the order, timeline, client update, and email automatically.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">
          {ORDER_STATUS_LABELS[currentStatus]}
        </span>
      </div>

      {paymentConfirmed ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-lime-50 p-5 text-lime-950">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">Payment confirmed</p>
            <p className="mt-1 text-sm leading-6">
              Production is active. The client has received the payment update,
              and the next meaningful action is to start Hermes or publish a
              poster.
            </p>
          </div>
        </div>
      ) : (
        <form action={paymentAction} className="mt-6 space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <div className="space-y-2">
            <Label htmlFor="paymentNote">Payment note (optional)</Label>
            <Textarea
              id="paymentNote"
              name="paymentNote"
              rows={2}
              maxLength={1000}
              placeholder="Add a private note if the receipt needs context."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              name="paymentStatus"
              value="confirmed"
              disabled={paymentPending}
            >
              <ShieldCheck />
              {paymentPending
                ? "Applying…"
                : "Confirm payment & start production"}
            </Button>
            <Button
              type="submit"
              name="paymentStatus"
              value="rejected"
              variant="outline"
              disabled={paymentPending}
            >
              <RotateCcw /> Reject proof
            </Button>
          </div>
          <ActionMessage state={paymentState} />
        </form>
      )}
    </section>
  );
}

function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-lg p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-lime-50 text-lime-900"}`}
    >
      {state.message}
    </p>
  );
}
