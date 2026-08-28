import { Plus } from "lucide-react";
import Link from "next/link";

import { OrderCard } from "@/components/client/order-card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { claims, supabase } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .maybeSingle();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("client_id", claims.sub)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
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
