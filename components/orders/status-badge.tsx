import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_BADGE_STYLES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_STYLES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/status";
import type { OrderStatus, PaymentStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const style = ORDER_STATUS_BADGE_STYLES[status];
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 px-2.5 font-semibold", style.badge)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  prefix = false,
}: {
  status: PaymentStatus;
  prefix?: boolean;
}) {
  const style = PAYMENT_STATUS_BADGE_STYLES[status];
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 px-2.5 font-semibold", style.badge)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {prefix ? "Payment: " : ""}
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
