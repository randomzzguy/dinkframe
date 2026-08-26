"use client";

import { useActionState } from "react";

import {
  updatePaymentSettings,
  type PaymentSettingsActionState,
} from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/lib/types/database";

const initialState: PaymentSettingsActionState = {
  status: "idle",
  message: "",
};

type PaymentSettings = Database["public"]["Tables"]["payment_settings"]["Row"];

export function PaymentSettingsForm({
  settings,
  qrUrl,
}: {
  settings: PaymentSettings | null;
  qrUrl: string | null;
}) {
  const [state, action, pending] = useActionState(
    updatePaymentSettings,
    initialState,
  );

  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Bank name" name="bankName" value={settings?.bank_name} />
        <Field
          label="Account name"
          name="accountName"
          value={settings?.account_name}
        />
        <Field
          label="Account number"
          name="accountNumber"
          value={settings?.account_number}
        />
        <Field
          label="DuitNow ID"
          name="duitnowId"
          value={settings?.duitnow_id}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Client payment instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={5}
          maxLength={1500}
          defaultValue={settings?.instructions ?? ""}
          placeholder="Include the payment reference clients should use."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentQr">Payment QR</Label>
        <Input
          id="paymentQr"
          name="paymentQr"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-xs text-neutral-500">
          JPG, PNG, or WebP up to 5 MB. A new upload replaces the active QR.
        </p>
        {qrUrl && (
          <a
            href={qrUrl}
            className="inline-block text-sm font-semibold underline underline-offset-4"
          >
            View current QR
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save payment settings"}
        </Button>
        {state.message && (
          <p
            role="status"
            className={`text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} maxLength={120} defaultValue={value ?? ""} />
    </div>
  );
}
