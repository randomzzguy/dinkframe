"use client";

import { useActionState } from "react";

import {
  changeOrderStatus,
  changePaymentStatus,
  type AdminActionState,
} from "@/app/admin/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/types/domain";

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
  const [statusState, statusAction, statusPending] = useActionState(
    changeOrderStatus,
    initialState,
  );
  const [paymentState, paymentAction, paymentPending] = useActionState(
    changePaymentStatus,
    initialState,
  );

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form
        action={paymentAction}
        className="space-y-4 rounded-2xl border border-black/10 bg-white p-6"
      >
        <input type="hidden" name="orderId" value={orderId} />
        <h2 className="font-bold">Payment review</h2>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment status</Label>
          <select
            id="paymentStatus"
            name="paymentStatus"
            defaultValue={currentPaymentStatus}
            className="border-input h-10 w-full rounded-lg border bg-white px-3 text-sm"
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {titleCase(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentNote">Payment note</Label>
          <Textarea
            id="paymentNote"
            name="paymentNote"
            rows={3}
            maxLength={1000}
          />
        </div>
        <Button type="submit" disabled={paymentPending}>
          {paymentPending ? "Updating…" : "Update payment"}
        </Button>
        <ActionMessage state={paymentState} />
      </form>

      <form
        action={statusAction}
        className="space-y-4 rounded-2xl border border-black/10 bg-white p-6"
      >
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="currentStatus" value={currentStatus} />
        <h2 className="font-bold">Production status</h2>
        <div className="space-y-2">
          <Label htmlFor="nextStatus">Move order to</Label>
          <select
            id="nextStatus"
            name="nextStatus"
            defaultValue={currentStatus}
            className="border-input h-10 w-full rounded-lg border bg-white px-3 text-sm"
          >
            {ORDER_STATUSES.filter((status) => status !== "archived").map(
              (status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">Internal status note</Label>
          <Textarea id="note" name="note" rows={2} maxLength={1000} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientMessage">Client-visible update</Label>
          <Textarea
            id="clientMessage"
            name="clientMessage"
            rows={3}
            maxLength={1000}
            placeholder="Your poster is now in the finishing touches stage."
          />
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <input
            type="checkbox"
            name="confirmUnusual"
            className="mt-0.5 accent-black"
          />
          I confirm this if it is an unusual or corrective transition.
        </label>
        <Button type="submit" disabled={statusPending}>
          {statusPending ? "Updating…" : "Update status"}
        </Button>
        <ActionMessage state={statusState} />
      </form>
    </div>
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

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
