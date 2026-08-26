"use client";

import { Archive, CheckCircle2, Download, Trash2 } from "lucide-react";
import { useActionState } from "react";

import {
  archiveOrder,
  deleteArchivedOrder,
  verifyLocalArchive,
  type AdminActionState,
} from "@/app/admin/orders/[id]/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types/domain";

const initialState: AdminActionState = { status: "idle", message: "" };

export function ArchiveControls({
  orderId,
  orderNumber,
  status,
  exportedAt,
  archiveVerifiedAt,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  exportedAt: string | null;
  archiveVerifiedAt: string | null;
}) {
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyLocalArchive,
    initialState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveOrder,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteArchivedOrder,
    initialState,
  );
  const exportable = ["completed", "cancelled", "archived"].includes(status);
  const archivable = ["completed", "cancelled"].includes(status);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="font-bold">Archive & retention</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Export the complete job, open the ZIP locally, then confirm it before
        archiving. Deletion remains locked until every step is complete.
      </p>

      <ol className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <ArchiveStep label="Export generated" complete={Boolean(exportedAt)} />
        <ArchiveStep
          label="Local ZIP verified"
          complete={Boolean(archiveVerifiedAt)}
        />
        <ArchiveStep label="Order archived" complete={status === "archived"} />
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        {exportable ? (
          <a
            href={`/admin/orders/${orderId}/export`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download /> Export order ZIP
          </a>
        ) : (
          <Button disabled variant="outline">
            <Download /> Complete order before export
          </Button>
        )}

        <form action={verifyAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button
            type="submit"
            variant="outline"
            disabled={!exportable || verifyPending}
          >
            <CheckCircle2 />{" "}
            {verifyPending ? "Verifying…" : "I opened the local ZIP"}
          </Button>
        </form>

        {archivable && (
          <form action={archiveAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <Button
              type="submit"
              disabled={!archiveVerifiedAt || archivePending}
            >
              <Archive /> {archivePending ? "Archiving…" : "Archive order"}
            </Button>
          </form>
        )}
      </div>
      <ActionMessage state={verifyState} />
      <ActionMessage state={archiveState} />

      {status === "archived" && (
        <form
          action={deleteAction}
          className="mt-8 space-y-4 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <div>
            <h3 className="font-bold text-red-900">Permanent deletion</h3>
            <p className="mt-1 text-sm text-red-800">
              This deletes private Storage files and database records. The audit
              log keeps only the order identity and deletion time.
            </p>
          </div>
          <input type="hidden" name="orderId" value={orderId} />
          <div className="max-w-sm space-y-2">
            <Label htmlFor="confirmationNumber">
              Type {orderNumber} to confirm
            </Label>
            <Input
              id="confirmationNumber"
              name="confirmationNumber"
              required
              autoComplete="off"
              placeholder={orderNumber}
            />
          </div>
          <Button type="submit" variant="destructive" disabled={deletePending}>
            <Trash2 /> {deletePending ? "Deleting…" : "Delete permanently"}
          </Button>
          <ActionMessage state={deleteState} />
        </form>
      )}
    </section>
  );
}

function ArchiveStep({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <li
      className={`rounded-lg p-3 ${complete ? "bg-lime-50 text-lime-900" : "bg-neutral-100 text-neutral-500"}`}
    >
      {complete ? "✓" : "○"} {label}
    </li>
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
