"use client";

import { Check, Download, FileImage, Send, UploadCloud } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { publishPosterDelivery } from "@/app/admin/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  posterDeliveryLabel,
  type PosterDeliveryKind,
  validatePosterDeliveryFile,
} from "@/lib/orders/delivery";
import { uploadPosterDelivery } from "@/lib/storage/upload-delivery";
import type { OrderStatus } from "@/lib/types/domain";

type PublishedDelivery = {
  id: string;
  originalFilename: string;
  isTemporary: boolean;
  createdAt: string;
  signedUrl: string | null;
};

export function PosterDeliveryUploader({
  orderId,
  orderStatus,
  paymentConfirmed,
  deliveries,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentConfirmed: boolean;
  deliveries: PublishedDelivery[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<PosterDeliveryKind>("review");
  const [file, setFile] = useState<File>();
  const [clientMessage, setClientMessage] = useState("");
  const [progress, setProgress] = useState<number>();
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  }>();
  const [pending, startTransition] = useTransition();
  const blocked =
    !paymentConfirmed ||
    orderStatus === "archived" ||
    orderStatus === "cancelled";

  function chooseFile(selected: File | undefined) {
    setMessage(undefined);
    if (!selected) {
      setFile(undefined);
      return;
    }
    const error = validatePosterDeliveryFile(selected);
    if (error) {
      setFile(undefined);
      setMessage({ tone: "error", text: error });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(selected);
  }

  function publish() {
    if (!file || blocked) return;
    setMessage(undefined);
    setProgress(0);

    startTransition(async () => {
      try {
        const uploaded = await uploadPosterDelivery({
          orderId,
          kind,
          file,
          onProgress: setProgress,
        });
        const result = await publishPosterDelivery({
          orderId,
          kind,
          ...uploaded,
          clientMessage: clientMessage || undefined,
        });
        if (result.status === "error") {
          setMessage({ tone: "error", text: result.message });
          return;
        }

        setMessage({ tone: "success", text: result.message });
        setFile(undefined);
        setClientMessage("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "We couldn't publish that poster.",
        });
      } finally {
        setProgress(undefined);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Client delivery</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Publish poster files
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Review drafts and final posters stay private and appear immediately
            in this client&apos;s order. Every upload is preserved in the order
            archive.
          </p>
        </div>
        <span className="rounded-full bg-lime-100 px-3 py-1.5 text-xs font-bold text-lime-950">
          Private delivery
        </span>
      </div>

      {!paymentConfirmed && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Confirm payment before publishing poster files.
        </p>
      )}
      {(orderStatus === "archived" || orderStatus === "cancelled") && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          This order can no longer receive poster deliveries.
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <div className="space-y-5 rounded-2xl bg-neutral-100 p-5">
          <div className="grid grid-cols-2 gap-3">
            {(["review", "final"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() => setKind(option)}
                className={`rounded-xl border p-4 text-left transition ${
                  kind === option
                    ? "border-black bg-neutral-950 text-white"
                    : "border-black/10 bg-white hover:border-black/25"
                }`}
              >
                <span className="flex items-center gap-2 font-bold">
                  {option === "review" ? (
                    <FileImage className="size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {option === "review" ? "Review draft" : "Final poster"}
                </span>
                <span
                  className={`mt-2 block text-xs leading-5 ${
                    kind === option ? "text-neutral-300" : "text-neutral-500"
                  }`}
                >
                  {option === "review"
                    ? "For client feedback during the amendment period."
                    : "The approved, full-quality client deliverable."}
                </span>
              </button>
            ))}
          </div>

          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/20 bg-white p-6 text-center transition hover:border-black/40">
            <UploadCloud className="size-7" />
            <span className="mt-3 font-bold">
              {file ? file.name : "Choose poster image"}
            </span>
            <span className="mt-1 text-xs text-neutral-500">
              JPEG, PNG, or WebP · maximum 25 MB
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending || blocked}
              onChange={(event) => chooseFile(event.target.files?.[0])}
              className="sr-only"
            />
          </label>

          {progress !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold">
                <span>Uploading securely</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div>
            <label htmlFor="delivery-message" className="text-sm font-bold">
              Client message <span className="font-normal">(optional)</span>
            </label>
            <Textarea
              id="delivery-message"
              value={clientMessage}
              onChange={(event) => setClientMessage(event.target.value)}
              maxLength={1000}
              rows={3}
              className="mt-2 bg-white"
              placeholder={
                kind === "review"
                  ? "Your first poster draft is ready. Please review it and submit any changes below."
                  : "Your approved final poster is ready to download."
              }
            />
          </div>

          <Button
            type="button"
            onClick={publish}
            disabled={!file || pending || blocked}
          >
            <Send />
            {pending
              ? "Publishing…"
              : kind === "review"
                ? "Publish review draft"
                : "Publish final poster"}
          </Button>

          {message && (
            <p
              role="status"
              className={`rounded-xl p-3 text-sm ${
                message.tone === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-lime-50 text-lime-900"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        <div>
          <h3 className="font-bold">Published files</h3>
          <div className="mt-4 space-y-3">
            {deliveries.map((delivery) => (
              <article
                key={delivery.id}
                className="flex items-center gap-3 rounded-xl border border-black/10 p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100">
                  <FileImage className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {delivery.originalFilename}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {posterDeliveryLabel(delivery.isTemporary)} ·{" "}
                    {formatDateTime(delivery.createdAt)}
                  </p>
                </div>
                {delivery.signedUrl && (
                  <a
                    href={delivery.signedUrl}
                    className="grid size-9 place-items-center rounded-lg hover:bg-neutral-100"
                    aria-label={`Download ${delivery.originalFilename}`}
                  >
                    <Download className="size-4" />
                  </a>
                )}
              </article>
            ))}
            {!deliveries.length && (
              <p className="rounded-xl border border-dashed border-black/15 p-5 text-sm text-neutral-500">
                No review or final poster files have been published yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
