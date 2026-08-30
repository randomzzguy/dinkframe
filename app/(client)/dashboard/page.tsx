import { Layers3, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

import { OrderCard } from "@/components/client/order-card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { claims, supabase } = await requireUser();
  const [profileResult, orderResult, entitlementResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", claims.sub)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("*")
      .eq("client_id", claims.sub)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("frame_entitlements")
      .select(
        "frames_total, frames_used, amendments_total, amendments_used, activated_at",
      )
      .eq("client_id", claims.sub),
  ]);
  const profile = profileResult.data;
  const orders = orderResult.data;
  const activeEntitlements = (entitlementResult.data ?? []).filter(
    (item) => item.activated_at,
  );
  const framesRemaining = activeEntitlements.reduce(
    (total, item) => total + Math.max(0, item.frames_total - item.frames_used),
    0,
  );
  const amendmentsRemaining = activeEntitlements.reduce(
    (total, item) =>
      total + Math.max(0, item.amendments_total - item.amendments_used),
    0,
  );
  const pendingPackages = (entitlementResult.data ?? []).filter(
    (item) => !item.activated_at,
  ).length;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Player";

  return (
    <>
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your orders</p>
          <h1 className="font-heading mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome back, {firstName}.
          </h1>
        </div>
        <Link
          href="/orders/new"
          className={cn(
            buttonVariants({ size: "lg" }),
            "rounded-full px-5 font-bold",
          )}
        >
          <Plus /> Create new order
        </Link>
      </div>
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-lime-300 bg-lime-50 p-5">
          <div className="flex items-center gap-3">
            <span className="bg-primary grid size-10 place-items-center rounded-2xl">
              <Layers3 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wider text-lime-800 uppercase">
                Frames available
              </p>
              <p className="font-heading text-3xl font-black">
                {framesRemaining}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-lime-950/65">
            Use these for new poster briefs without paying or uploading another
            receipt.
          </p>
        </div>
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-neutral-100">
              <RefreshCw className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                Amendments available
              </p>
              <p className="font-heading text-3xl font-black">
                {amendmentsRemaining}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            Shared across every frame in your activated packages.
            {pendingPackages > 0
              ? ` ${pendingPackages} package${pendingPackages === 1 ? " is" : "s are"} awaiting payment confirmation.`
              : ""}
          </p>
        </div>
      </section>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {orders?.length ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <div className="col-span-full rounded-3xl border border-dashed border-black/15 bg-white/80 p-12 text-center shadow-sm backdrop-blur">
            <h2 className="text-xl font-bold">No active orders yet.</h2>
            <p className="mt-2 text-neutral-600">
              Your next tournament poster starts here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
