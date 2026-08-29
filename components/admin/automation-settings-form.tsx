"use client";

import { useActionState } from "react";
import { Send, ShieldCheck } from "lucide-react";

import {
  updateAutomationSettings,
  type AutomationSettingsActionState,
} from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/types/database";

const initialState: AutomationSettingsActionState = {
  status: "idle",
  message: "",
};

type AutomationSettings =
  Database["public"]["Tables"]["automation_settings"]["Row"];

export function AutomationSettingsForm({
  settings,
}: {
  settings: AutomationSettings | null;
}) {
  const [state, action, pending] = useActionState(
    updateAutomationSettings,
    initialState,
  );
  const autoSend = settings?.chatgpt_submission_mode === "auto_send";

  return (
    <form action={action} className="space-y-6">
      <label className="group flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-black/10 bg-neutral-50 p-5 transition hover:border-black/20">
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-bold">
            <Send className="size-4" />
            Allow the companion to press Send
          </span>
          <span className="mt-2 block max-w-2xl text-sm leading-6 text-neutral-600">
            When enabled, a message may be submitted only after you explicitly
            queue its order and the companion verifies the expected brief and
            attachments. Turn it off to review every prepared message yourself.
          </span>
        </span>

        <span className="relative mt-0.5 shrink-0">
          <input
            className="peer sr-only"
            type="checkbox"
            name="autoSend"
            defaultChecked={autoSend}
            aria-label="Allow the companion to press Send"
          />
          <span className="block h-7 w-12 rounded-full bg-neutral-300 transition peer-checked:bg-lime-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black" />
          <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      <div
        className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
          autoSend
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-lime-200 bg-lime-50 text-lime-950"
        }`}
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          {autoSend
            ? "Auto-send remains available only to the legacy Playwright companion. The Hermes workflow always requires Telegram approval before image generation."
            : "Review mode is active. The Hermes workflow asks for approval in Telegram before image generation and again after the draft is ready."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save automation mode"}
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
