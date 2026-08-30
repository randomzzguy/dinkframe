import { Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";

import { OrderControls } from "@/components/admin/order-controls";
import { ArchiveControls } from "@/components/admin/archive-controls";
import { GenerationControls } from "@/components/admin/generation-controls";
import { PosterDeliveryUploader } from "@/components/admin/poster-delivery-uploader";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/guards";
import { posterDeliveryLabel } from "@/lib/orders/delivery";
import {
  formatAnnouncementTone,
  formatFrameType,
  formatPlacement,
} from "@/lib/orders/frame-types";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: entitlement } = order.frame_entitlement_id
    ? await supabase
        .from("frame_entitlements")
        .select("frames_total, frames_used, amendments_total, amendments_used")
        .eq("id", order.frame_entitlement_id)
        .maybeSingle()
    : { data: null };

  const [
    profileResult,
    eventResult,
    sponsorResult,
    assetResult,
    historyResult,
    amendmentResult,
    generationJobResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, whatsapp, instagram_handle")
      .eq("id", order.client_id)
      .maybeSingle(),
    supabase
      .from("order_event_details")
      .select("*")
      .eq("order_id", id)
      .order("sort_order"),
    supabase
      .from("sponsors")
      .select("*")
      .eq("order_id", id)
      .order("created_at"),
    supabase
      .from("order_assets")
      .select("*")
      .eq("order_id", id)
      .order("asset_type"),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("amendments")
      .select("*")
      .eq("order_id", id)
      .order("amendment_number", { ascending: false }),
    supabase
      .from("generation_jobs")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const signedAssets = await Promise.all(
    (assetResult.data ?? []).map(async (asset) => {
      const { data } = await supabase.storage
        .from(asset.bucket_id)
        .createSignedUrl(asset.storage_path, 300, {
          download: asset.original_filename,
        });
      return { ...asset, signedUrl: data?.signedUrl ?? null };
    }),
  );
  const paymentProof = signedAssets.find(
    (asset) => asset.asset_type === "payment_proof",
  );
  const posterDeliveries = signedAssets
    .filter((asset) => asset.asset_type === "final_poster")
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const profile = profileResult.data;
  const freeRemaining = Math.max(
    0,
    entitlement
      ? entitlement.amendments_total - entitlement.amendments_used
      : order.free_amendments_total - order.free_amendments_used,
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{order.order_number}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {order.player_name} — {order.tournament_name}
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Submitted {formatDateTime(order.submitted_at ?? order.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">
            Payment: {order.payment_status.replaceAll("_", " ")}
          </Badge>
          <Badge variant="secondary">{ORDER_STATUS_LABELS[order.status]}</Badge>
        </div>
      </div>

      <div className="mt-10 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold">Client & player brief</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Client email" value={profile?.email ?? "—"} />
              <Detail label="WhatsApp" value={order.whatsapp} />
              <Detail
                label="Instagram"
                value={
                  order.instagram_handle ? `@${order.instagram_handle}` : "—"
                }
              />
              <Detail label="Tournament" value={order.tournament_name} />
              <Detail
                label="Frame type"
                value={formatFrameType(order.frame_type)}
              />
              <Detail label="Location" value={order.tournament_location} />
              <Detail
                label="Dates"
                value={`${formatDate(order.tournament_start_date)} – ${formatDate(order.tournament_end_date)}`}
              />
              <Detail
                label="Package"
                value={`${order.package_name_snapshot} · RM${order.package_price_snapshot}`}
              />
              <Detail
                label="Creative direction"
                value={`${titleCase(order.color_preference)} · ${titleCase(order.theme_preference)}`}
              />
              <Detail
                label="Free amendments"
                value={`${freeRemaining} remaining of ${entitlement?.amendments_total ?? order.free_amendments_total}`}
              />
              {entitlement && (
                <Detail
                  label="Package frames"
                  value={`${Math.max(0, entitlement.frames_total - entitlement.frames_used)} remaining of ${entitlement.frames_total}`}
                />
              )}
            </dl>
            {order.custom_notes && (
              <div className="mt-6 rounded-xl bg-neutral-100 p-4">
                <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Client notes
                </p>
                <p className="mt-2 text-sm leading-6">{order.custom_notes}</p>
              </div>
            )}
            {order.frame_type === "announcement" &&
              order.announcement_message && (
                <div className="mt-6 rounded-xl bg-neutral-100 p-4">
                  <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                    Announcement ·{" "}
                    {order.announcement_tone
                      ? formatAnnouncementTone(order.announcement_tone)
                      : "Tone not set"}
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {order.announcement_message}
                  </p>
                </div>
              )}
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold">Events & sponsors</h2>
            <div className="mt-5 grid gap-7 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Events
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {(eventResult.data ?? []).map((event) => (
                    <li key={event.id}>
                      {event.event_name}
                      {event.partner_name ? ` — ${event.partner_name}` : ""}
                      {event.placement
                        ? ` · ${formatPlacement(event.placement)}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Sponsors
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {(sponsorResult.data ?? []).map((sponsor) => (
                    <li key={sponsor.id}>{sponsor.company_name}</li>
                  ))}
                  {!sponsorResult.data?.length && (
                    <li className="text-neutral-400">No sponsors</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold">Private assets</h2>
              <span className="text-xs text-neutral-500">
                Links expire in 5 minutes
              </span>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-2xl text-left text-sm">
                <thead className="border-b text-xs tracking-wider text-neutral-500 uppercase">
                  <tr>
                    <th className="pb-3">File</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {signedAssets.map((asset) => (
                    <tr key={asset.id} className="border-b last:border-0">
                      <td className="py-3">
                        <span className="flex items-center gap-2">
                          <FileText className="size-4 text-neutral-400" />
                          {asset.original_filename}
                        </span>
                      </td>
                      <td className="py-3 capitalize">
                        {asset.asset_type === "final_poster"
                          ? posterDeliveryLabel(asset.is_temporary)
                          : asset.asset_type.replaceAll("_", " ")}
                      </td>
                      <td className="py-3">{formatBytes(asset.file_size)}</td>
                      <td className="py-3 text-right">
                        {asset.signedUrl ? (
                          <a
                            href={asset.signedUrl}
                            className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                          >
                            <Download className="size-4" /> Download
                          </a>
                        ) : (
                          "Unavailable"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold">Payment proof</h2>
            {paymentProof?.signedUrl ? (
              <>
                <div className="mt-5 grid aspect-video place-items-center rounded-xl bg-neutral-100">
                  <FileText className="size-10 text-neutral-400" />
                </div>
                <a
                  href={paymentProof.signedUrl}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
                >
                  <Download className="size-4" /> Open{" "}
                  {paymentProof.original_filename}
                </a>
              </>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No proof available.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold">Amendments</h2>
            <div className="mt-4 space-y-3">
              {(amendmentResult.data ?? []).map((amendment) => (
                <article
                  key={amendment.id}
                  className="rounded-xl bg-neutral-100 p-4"
                >
                  <div className="flex justify-between gap-3 text-xs text-neutral-500">
                    <span>
                      #{amendment.amendment_number} ·{" "}
                      {titleCase(amendment.billing_kind)}
                    </span>
                    <span>{titleCase(amendment.status)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6">
                    {amendment.request_text}
                  </p>
                </article>
              ))}
              {!amendmentResult.data?.length && (
                <p className="text-sm text-neutral-500">
                  No amendments submitted.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-bold">Status history</h2>
            <ol className="mt-5 space-y-4">
              {(historyResult.data ?? []).map((entry) => (
                <li key={entry.id} className="border-primary border-l-2 pl-4">
                  <p className="text-sm font-semibold">
                    {ORDER_STATUS_LABELS[entry.new_status]}
                  </p>
                  {entry.note && (
                    <p className="mt-1 text-sm text-neutral-600">
                      {entry.note}
                    </p>
                  )}
                  <time className="mt-1 block text-xs text-neutral-400">
                    {formatDateTime(entry.created_at)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="mt-5">
        <OrderControls
          orderId={order.id}
          currentStatus={order.status}
          currentPaymentStatus={order.payment_status}
        />
      </div>
      <div className="mt-5">
        <GenerationControls
          orderId={order.id}
          paymentConfirmed={order.payment_status === "confirmed"}
          jobs={generationJobResult.data ?? []}
        />
      </div>
      <div className="mt-5">
        <PosterDeliveryUploader
          orderId={order.id}
          orderStatus={order.status}
          paymentConfirmed={order.payment_status === "confirmed"}
          deliveries={posterDeliveries.map((asset) => ({
            id: asset.id,
            originalFilename: asset.original_filename,
            isTemporary: asset.is_temporary,
            createdAt: asset.created_at,
            signedUrl: asset.signedUrl,
          }))}
        />
      </div>
      <div className="mt-5">
        <ArchiveControls
          orderId={order.id}
          orderNumber={order.order_number}
          status={order.status}
          exportedAt={order.exported_at}
          archiveVerifiedAt={order.archive_verified_at}
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}
