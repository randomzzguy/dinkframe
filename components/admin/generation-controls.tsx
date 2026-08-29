"use client";

import { Bot, MessageCircle, RotateCcw, X } from "lucide-react";
import { useActionState } from "react";

import {
  cancelGenerationJob,
  queuePromptGeneration,
  retryGenerationJob,
  type AdminActionState,
} from "@/app/admin/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  GENERATION_STAGE_LABELS,
  GENERATION_STATUS_LABELS,
} from "@/lib/automation/generation";
import type { Database } from "@/lib/types/database";

type GenerationJob = Database["public"]["Tables"]["generation_jobs"]["Row"];

const initialState: AdminActionState = { status: "idle", message: "" };
const activeStatuses = new Set([
  "queued",
  "claimed",
  "preparing",
  "awaiting_review",
]);

export function GenerationControls({
  orderId,
  paymentConfirmed,
  jobs,
}: {
  orderId: string;
  paymentConfirmed: boolean;
  jobs: GenerationJob[];
}) {
  const [promptState, promptAction, promptPending] = useActionState(
    queuePromptGeneration,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelGenerationJob,
    initialState,
  );
  const [retryState, retryAction, retryPending] = useActionState(
    retryGenerationJob,
    initialState,
  );

  const hasActiveWorkflow = jobs.some((job) => activeStatuses.has(job.status));

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Next-generation workflow</p>
          <h2 className="mt-2 text-xl font-bold">Hermes production</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Hermes creates the professional production prompt, sends it to your
            private Telegram for approval, then generates exactly one image
            draft only after you approve it.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-900">
          <MessageCircle className="size-3.5" /> Telegram approval required
        </span>
      </div>

      {!paymentConfirmed && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Confirm payment before queuing production automation.
        </p>
      )}

      <div className="mt-6">
        <form action={promptAction} className="rounded-xl bg-neutral-100 p-5">
          <input type="hidden" name="orderId" value={orderId} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-200 text-lime-950">
              <Bot className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">Start creative production</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Snapshots the paid order and assets. Hermes prepares the prompt,
                waits for your Telegram approval, generates one draft, and waits
                for your final review.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            className="mt-5"
            disabled={!paymentConfirmed || hasActiveWorkflow || promptPending}
          >
            {promptPending ? "Queuing…" : "Start Hermes workflow"}
          </Button>
          <ActionMessage state={promptState} />
        </form>
      </div>

      <div className="mt-7">
        <h3 className="font-bold">Generation history</h3>
        <div className="mt-3 space-y-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/10 p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">
                    {GENERATION_STAGE_LABELS[job.stage]}
                  </p>
                  <span className={statusClass(job.status)}>
                    {GENERATION_STATUS_LABELS[job.status]}
                  </span>
                  {job.status === "awaiting_review" && (
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800">
                      Reply in Telegram
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatDateTime(job.created_at)} · Attempt {job.attempt_count}
                </p>
                {job.last_error && (
                  <p className="mt-2 max-w-2xl text-sm text-red-700">
                    {job.last_error}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {job.status === "failed" && (
                  <JobActionForm
                    action={retryAction}
                    orderId={orderId}
                    jobId={job.id}
                    disabled={retryPending}
                    label="Retry"
                    icon={<RotateCcw className="size-3.5" />}
                  />
                )}
                {activeStatuses.has(job.status) && (
                  <JobActionForm
                    action={cancelAction}
                    orderId={orderId}
                    jobId={job.id}
                    disabled={cancelPending}
                    label="Cancel"
                    icon={<X className="size-3.5" />}
                  />
                )}
              </div>
            </article>
          ))}
          {!jobs.length && (
            <p className="rounded-xl border border-dashed border-black/15 p-5 text-sm text-neutral-500">
              No generation jobs have been queued for this order.
            </p>
          )}
        </div>
        <ActionMessage state={cancelState} />
        <ActionMessage state={retryState} />
      </div>
    </section>
  );
}

function JobActionForm({
  action,
  orderId,
  jobId,
  disabled,
  label,
  icon,
}: {
  action: (payload: FormData) => void;
  orderId: string;
  jobId: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" size="sm" variant="outline" disabled={disabled}>
        {icon} {label}
      </Button>
    </form>
  );
}

function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`mt-4 rounded-lg p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-lime-50 text-lime-900"}`}
    >
      {state.message}
    </p>
  );
}

function statusClass(status: GenerationJob["status"]) {
  if (status === "failed")
    return "rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700";
  if (status === "submitted")
    return "rounded-full bg-lime-100 px-2 py-1 text-[11px] font-bold text-lime-900";
  if (status === "awaiting_review")
    return "rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900";
  return "rounded-full bg-neutral-200 px-2 py-1 text-[11px] font-bold text-neutral-700";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
