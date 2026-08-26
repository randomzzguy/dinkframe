import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status";
import type { Database } from "@/lib/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`} className="group block">
      <Card className="transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
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
            <ArrowUpRight className="size-5 text-neutral-400" />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-neutral-500">
            {order.package_name_snapshot} · RM{order.package_price_snapshot}
          </div>
          <Badge variant="secondary">{ORDER_STATUS_LABELS[order.status]}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
