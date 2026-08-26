import { Check, Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";

import { AmendmentForm } from "@/components/client/amendment-form";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/types/domain";

const timeline: { status: OrderStatus; label: string }[] = [
  { status: "request_received", label: "Received" },
  { status: "payment_confirmed", label: "Payment confirmed" },
  { status: "design_in_progress", label: "In progress" },
  { status: "finishing_touches", label: "Finishing touches" },
  { status: "amendment_period", label: "Amendments" },
  { status: "completed", label: "Done" },
];

export default async function OrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const { supabase } = await requireUser();
  const [orderResult, eventResult, assetResult, updateResult, amendmentResult] =
    await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("order_event_details")
        .select("*")
        .eq("order_id", id)
        .order("sort_order"),
      supabase
        .from("order_assets")
        .select("*")
        .eq("order_id", id)
        .order("created_at"),
      supabase
        .from("order_events")
        .select("*")
        .eq("order_id", id)
        .eq("is_client_visible", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("amendments")
        .select("*")
        .eq("order_id", id)
        .order("amendment_number", { ascending: false }),
    ]);

  const order = orderResult.data;
  if (!order) notFound();

  const signedAssets = await Promise.all(
    (assetResult.data ?? []).map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.bucket_id)
        .createSignedUrl(asset.storage_path, 300);
      return { ...asset, signedUrl: data?.signedUrl ?? null };
    }),
  );
  const currentIndex =
    order.status === "archived"
      ? timeline.length - 1
      : timeline.findIndex((item) => item.status === order.status);
  const freeRemaining = Math.max(
    0,
    order.free_amendments_total - order.free_amendments_used,
  );

  return (
    <div>
      {submitted === "1" && (
        <div className="mb-7 rounded-xl border border-lime-300 bg-lime-50 p-5 text-lime-950">
          <p className="font-bold">Order received — {order.order_number}</p>
          <p className="mt-1 text-sm">
            We&apos;ll review your submission and payment shortly.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{order.order_number}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {order.player_name} — {order.tournament_name}
          </h1>
        </div>
        <Badge variant="secondary">{ORDER_STATUS_LABELS[order.status]}</Badge>
      </div>

      {order.status === "cancelled" ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          This order is cancelled. Contact DINKFRAME if you need help.
        </div>
      ) : (
        <section className="mt-10 rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-bold">Production timeline</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {timeline.map((item, index) => {
              const reached = currentIndex >= index;
              return (
                <li
                  key={item.status}
                  className="flex items-center gap-3 sm:block"
                >
                  <span
                    className={`grid size-8 place-items-center rounded-full text-xs font-bold ${reached ? "bg-primary text-black" : "bg-neutral-100 text-neutral-400"}`}
                  >
                    {reached ? <Check className="size-4" /> : index + 1}
                  </span>
                  <p
                    className={`text-sm sm:mt-3 ${reached ? "font-semibold" : "text-neutral-400"}`}
                  >
                    {item.label}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-bold">Order overview</h2>
          <dl className="mt-5 grid grid-cols-2 gap-5 text-sm">
            <Detail label="Tournament" value={order.tournament_name} />
            <Detail label="Location" value={order.tournament_location} />
            <Detail
              label="Dates"
              value={`${formatDate(order.tournament_start_date)} – ${formatDate(order.tournament_end_date)}`}
            />
            <Detail label="Package" value={order.package_name_snapshot} />
            <Detail
              label="Amount"
              value={`RM${order.package_price_snapshot}`}
            />
            <Detail
              label="Payment"
              value={order.payment_status.replaceAll("_", " ")}
            />
            <Detail label="Color" value={order.color_preference} />
            <Detail label="Theme" value={order.theme_preference} />
          </dl>
          <div className="mt-6 border-t border-black/10 pt-5">
            <h3 className="text-sm font-bold">Events</h3>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              {(eventResult.data ?? []).map((event) => (
                <li key={event.id}>
                  {event.event_name}
                  {event.partner_name
                    ? ` — Partner: ${event.partner_name}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-bold">Updates</h2>
          <div className="mt-5 space-y-4">
            {(updateResult.data ?? []).map((update) => (
              <article
                key={update.id}
                className="border-primary border-l-2 pl-4"
              >
                <p className="text-sm leading-6 text-neutral-700">
                  {update.message}
                </p>
                <time className="mt-1 block text-xs text-neutral-400">
                  {formatDateTime(update.created_at)}
                </time>
              </article>
            ))}
            {!updateResult.data?.length && (
              <p className="text-sm text-neutral-600">
                We&apos;ll post production updates here as your order moves
                forward.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="font-bold">Uploaded assets</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signedAssets.map((asset) => (
            <article
              key={asset.id}
              className="overflow-hidden rounded-xl border border-black/10"
            >
              {asset.mime_type.startsWith("image/") && asset.signedUrl ? (
                <div
                  role="img"
                  aria-label={`Preview of ${asset.original_filename}`}
                  className="aspect-video bg-neutral-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${asset.signedUrl})` }}
                />
              ) : (
                <div className="grid aspect-video place-items-center bg-neutral-100">
                  <FileText className="size-8 text-neutral-400" />
                </div>
              )}
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {asset.original_filename}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {asset.asset_type.replaceAll("_", " ")}
                  </p>
                </div>
                {asset.signedUrl && (
                  <a
                    href={asset.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Download ${asset.original_filename}`}
                    className="grid size-9 place-items-center rounded-lg hover:bg-neutral-100"
                  >
                    <Download className="size-4" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="font-bold">Amendments</h2>
        <div className="mt-5 grid gap-7 lg:grid-cols-2">
          <div className="space-y-3">
            {(amendmentResult.data ?? []).map((amendment) => (
              <article
                key={amendment.id}
                className="rounded-xl bg-neutral-100 p-4"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
                  <span>Amendment {amendment.amendment_number}</span>
                  <span className="capitalize">{amendment.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6">
                  {amendment.request_text}
                </p>
                <p className="mt-3 text-xs font-semibold text-neutral-500">
                  {amendment.billing_kind === "free"
                    ? "Free amendment"
                    : "Additional payment required"}
                </p>
              </article>
            ))}
            {!amendmentResult.data?.length && (
              <p className="text-sm text-neutral-500">
                No amendments submitted.
              </p>
            )}
          </div>
          {order.status === "amendment_period" ? (
            <AmendmentForm orderId={order.id} freeRemaining={freeRemaining} />
          ) : (
            <p className="text-sm leading-6 text-neutral-600">
              Amendment requests open when your order enters the amendment
              period. You have {freeRemaining} free amendment
              {freeRemaining === 1 ? "" : "s"} remaining.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
