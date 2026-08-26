"use client";

import { useActionState } from "react";

import {
  submitAmendment,
  type AmendmentState,
} from "@/app/(client)/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: AmendmentState = { status: "idle", message: "" };

export function AmendmentForm({
  orderId,
  freeRemaining,
}: {
  orderId: string;
  freeRemaining: number;
}) {
  const [state, action, pending] = useActionState(
    submitAmendment,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <p className="text-sm font-bold">
          {freeRemaining} free amendment{freeRemaining === 1 ? "" : "s"}{" "}
          remaining
        </p>
        {freeRemaining === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            Additional amendments are RM10 each and require manual confirmation.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestText">Requested changes</Label>
        <Textarea
          id="requestText"
          name="requestText"
          required
          minLength={2}
          maxLength={3000}
          rows={5}
          placeholder="Describe the exact text, layout, or image changes you need."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit amendment"}
      </Button>
      {state.message && (
        <p
          role="status"
          className={`rounded-lg p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-lime-50 text-lime-900"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
