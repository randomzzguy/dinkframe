import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/lib/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`} className="group block">
      <Card className="interactive-card border-0 bg-white/90 group-hover:-translate-y-1 group-hover:shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider text-neutral-500 uppercase">
                {order.order_number}
              </p>
              <CardTitle className="mt-2 text-lg">
                {order.player_name} — {order.tournament_name}
              </CardTitle>
            </div>
            <span className="group-hover:bg-primary grid size-9 place-items-center rounded-xl bg-neutral-100 transition duration-300">
              <ArrowUpRight className="size-4 text-neutral-500 transition group-hover:text-black" />
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-neutral-500">
            {order.package_name_snapshot} · RM{order.package_price_snapshot}
          </div>
          <OrderStatusBadge status={order.status} />
        </CardContent>
      </Card>
    </Link>
  );
}
