import { randomUUID } from "node:crypto";
import { PassThrough, Readable } from "node:stream";

import {
  ZipArchive,
  type Archiver,
  type ArchiverError,
  type EntryData,
} from "archiver";

import { requireAdmin } from "@/lib/auth/guards";
import {
  createAssetArchivePath,
  createOrderExportFilename,
} from "@/lib/orders/export";
import type { Database } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderAsset = Database["public"]["Tables"]["order_assets"]["Row"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orderError || !order) {
    return new Response("Order not found", { status: 404 });
  }
  if (!["completed", "cancelled", "archived"].includes(order.status)) {
    return new Response("Complete or cancel the order before exporting it.", {
      status: 409,
    });
  }

  const [profile, players, events, sponsors, assets, amendments, history] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("email, full_name, whatsapp, instagram_handle")
        .eq("id", order.client_id)
        .maybeSingle(),
      supabase
        .from("order_players")
        .select("*")
        .eq("order_id", id)
        .order("sort_order"),
      supabase
        .from("order_event_details")
        .select("*")
        .eq("order_id", id)
        .order("sort_order"),
      supabase.from("sponsors").select("*").eq("order_id", id),
      supabase
        .from("order_assets")
        .select("*")
        .eq("order_id", id)
        .order("asset_type"),
      supabase
        .from("amendments")
        .select("*")
        .eq("order_id", id)
        .order("amendment_number"),
      supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at"),
    ]);

  const queryError = [
    profile,
    players,
    events,
    sponsors,
    assets,
    amendments,
    history,
  ].find((result) => result.error)?.error;
  if (queryError) {
    const errorId = randomUUID();
    console.error("order_export_query_failed", { errorId, queryError });
    return new Response(`Export could not be prepared. Reference: ${errorId}`, {
      status: 500,
    });
  }

  const output = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.pipe(output);
  archive.on("warning", (error: ArchiverError) =>
    console.warn("order_export_warning", { orderId: id, error }),
  );
  archive.on("error", (error: ArchiverError) => output.destroy(error));
  request.signal.addEventListener("abort", () => archive.abort(), {
    once: true,
  });

  void writeArchive({
    archive,
    supabase,
    order,
    profile: profile.data,
    players: players.data ?? [],
    events: events.data ?? [],
    sponsors: sponsors.data ?? [],
    assets: assets.data ?? [],
    amendments: amendments.data ?? [],
    history: history.data ?? [],
  }).catch((error) => {
    const errorId = randomUUID();
    console.error("order_export_stream_failed", {
      errorId,
      orderId: id,
      error,
    });
    output.destroy(error instanceof Error ? error : new Error(errorId));
  });

  const filename = createOrderExportFilename({
    orderNumber: order.order_number,
    playerName: order.player_name,
    tournamentName: order.tournament_name,
  });

  return new Response(Readable.toWeb(output) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function writeArchive({
  archive,
  supabase,
  order,
  profile,
  players,
  events,
  sponsors,
  assets,
  amendments,
  history,
}: {
  archive: Archiver;
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  order: Database["public"]["Tables"]["orders"]["Row"];
  profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "email" | "full_name" | "whatsapp" | "instagram_handle"
  > | null;
  players: Database["public"]["Tables"]["order_players"]["Row"][];
  events: Database["public"]["Tables"]["order_event_details"]["Row"][];
  sponsors: Database["public"]["Tables"]["sponsors"]["Row"][];
  assets: OrderAsset[];
  amendments: Database["public"]["Tables"]["amendments"]["Row"][];
  history: Database["public"]["Tables"]["order_status_history"]["Row"][];
}) {
  appendJson(archive, "metadata/order.json", {
    exportedAt: new Date().toISOString(),
    order,
    client: profile,
  });
  appendJson(archive, "metadata/players.json", players);
  appendJson(archive, "metadata/events.json", events);
  appendJson(archive, "metadata/sponsors.json", sponsors);
  appendJson(archive, "metadata/amendments.json", amendments);
  appendJson(archive, "metadata/status-history.json", history);

  for (const [index, asset] of assets.entries()) {
    const { data, error } = await supabase.storage
      .from(asset.bucket_id)
      .createSignedUrl(asset.storage_path, 300);
    if (error || !data?.signedUrl) {
      throw error ?? new Error(`Could not sign asset ${asset.id}`);
    }

    const response = await fetch(data.signedUrl, { cache: "no-store" });
    if (!response.ok || !response.body) {
      throw new Error(`Could not read asset ${asset.id}`);
    }

    const archivePath = createAssetArchivePath(asset, index);
    await appendStream(
      archive,
      archivePath,
      Readable.from(response.body as unknown as AsyncIterable<Uint8Array>),
    );
  }

  await archive.finalize();
  const { error } = await supabase.rpc("mark_order_exported", {
    target_order_id: order.id,
  });
  if (error) throw error;
}

function appendJson(archive: Archiver, path: string, value: unknown) {
  archive.append(`${JSON.stringify(value, null, 2)}\n`, { name: path });
}

function appendStream(archive: Archiver, path: string, stream: Readable) {
  return new Promise<void>((resolve, reject) => {
    const onEntry = (entry: EntryData) => {
      if (entry.name !== path) return;
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      archive.off("entry", onEntry);
      archive.off("error", onError);
    };

    archive.on("entry", onEntry);
    archive.on("error", onError);
    archive.append(stream, { name: path });
  });
}
