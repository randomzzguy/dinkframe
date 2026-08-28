"use client";

import { Bot, ExternalLink, ImageIcon, RotateCcw, Send, X } from "lucide-react";
import { useActionState } from "react";

import {
  cancelGenerationJob,
  markGenerationJobSubmitted,
  queueImageGeneration,
  queuePromptGeneration,
  retryGenerationJob,
  type AdminActionState,
} from "@/app/admin/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  GENERATION_STAGE_LABELS,
  GENERATION_STATUS_LABELS,
} from "@/lib/automation/generation";
import {
  CHATGPT_NEW_CHAT_URL,
  PROMPT_STUDIO_CHAT_URL,
} from "@/lib/automation/chatgpt";
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
  const [imageState, imageAction, imagePending] = useActionState(
    queueImageGeneration,
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
  const [sentState, sentAction, sentPending] = useActionState(
    markGenerationJobSubmitted,
    initialState,
  );

  const hasActivePrompt = jobs.some(
    (job) =>
      job.stage === "prompt_generation" && activeStatuses.has(job.status),
  );
  const hasActiveImage = jobs.some(
    (job) => job.stage === "image_generation" && activeStatuses.has(job.status),
  );

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Hermes-ready workflow</p>
          <h2 className="mt-2 text-xl font-bold">ChatGPT production</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Queue only when the order is ready. The local companion verifies the
            snapshotted assets and follows the review or auto-send setting saved
            on that job.
          </p>
        </div>
        <a
          href={PROMPT_STUDIO_CHAT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
        >
          Open Prompt Studio <ExternalLink className="size-4" />
        </a>
      </div>

      {!paymentConfirmed && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Confirm payment before queuing production automation.
        </p>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <form action={promptAction} className="rounded-xl bg-neutral-100 p-5">
          <input type="hidden" name="orderId" value={orderId} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-200 text-lime-950">
              <Bot className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">1. Prepare the production prompt</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Sends the order brief and tournament logo to your dedicated
                Prompt Studio conversation.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            className="mt-5"
            disabled={!paymentConfirmed || hasActivePrompt || promptPending}
          >
            {promptPending ? "Queuing…" : "Queue Prompt Studio"}
          </Button>
          <ActionMessage state={promptState} />
        </form>

        <form action={imageAction} className="rounded-xl bg-neutral-100 p-5">
          <input type="hidden" name="orderId" value={orderId} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-900">
              <ImageIcon className="size-5" />
            </span>
            <div>
              <h3 className="font-bold">2. Generate the poster image</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Paste the Prompt Studio response. The companion attaches the
                tournament logo and player photos in a fresh ChatGPT chat.
              </p>
            </div>
          </div>
          <Textarea
            name="generatedPrompt"
            className="mt-4 min-h-40 bg-white"
            maxLength={50000}
            placeholder="Paste the complete generated image prompt here…"
            required
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={!paymentConfirmed || hasActiveImage || imagePending}
            >
              {imagePending ? "Queuing…" : "Queue image generation"}
            </Button>
            <a
              href={CHATGPT_NEW_CHAT_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold underline underline-offset-4"
            >
              Open ChatGPT manually
            </a>
          </div>
          <ActionMessage state={imageState} />
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
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">
                    {job.submission_mode === "auto_send"
                      ? "Auto-send"
                      : "Review first"}
                  </span>
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
                {job.status === "awaiting_review" && (
                  <JobActionForm
                    action={sentAction}
                    orderId={orderId}
                    jobId={job.id}
                    disabled={sentPending}
                    label="Mark sent"
                    icon={<Send className="size-3.5" />}
                  />
                )}
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
        <ActionMessage state={sentState} />
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
