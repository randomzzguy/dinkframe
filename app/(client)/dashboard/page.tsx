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
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your orders</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Welcome, {firstName}.
          </h1>
        </div>
        <Link
          href="/orders/new"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 rounded-full px-5 font-bold",
          )}
        >
          <Plus /> Create new order
        </Link>
      </div>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {orders?.length ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-black/20 bg-white p-10 text-center">
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
