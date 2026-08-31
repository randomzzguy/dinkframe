import type { OrderStatus, PaymentStatus } from "@/lib/types/domain";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  request_received: "Request Received",
  payment_confirmed: "Payment Confirmed",
  design_in_progress: "Design In Progress",
  finishing_touches: "Finishing Touches",
  amendment_period: "Amendment Period",
  completed: "Completed",
  archived: "Archived",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  proof_uploaded: "Proof Uploaded",
  confirmed: "Confirmed",
  rejected: "Rejected",
};

export const ORDER_STATUS_BADGE_STYLES: Record<
  OrderStatus,
  { badge: string; dot: string }
> = {
  request_received: {
    badge: "border-sky-200 bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
  },
  payment_confirmed: {
    badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
    dot: "bg-cyan-500",
  },
  design_in_progress: {
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    dot: "bg-violet-500",
  },
  finishing_touches: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  amendment_period: {
    badge: "border-orange-200 bg-orange-50 text-orange-800",
    dot: "bg-orange-500",
  },
  completed: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  archived: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  cancelled: {
    badge: "border-red-200 bg-red-50 text-red-800",
    dot: "bg-red-500",
  },
};

export const PAYMENT_STATUS_BADGE_STYLES: Record<
  PaymentStatus,
  { badge: string; dot: string }
> = {
  pending: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  proof_uploaded: {
    badge: "border-blue-200 bg-blue-50 text-blue-800",
    dot: "bg-blue-500",
  },
  confirmed: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  rejected: {
    badge: "border-red-200 bg-red-50 text-red-800",
    dot: "bg-red-500",
  },
};

export const STANDARD_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  request_received: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["design_in_progress", "cancelled"],
  design_in_progress: ["finishing_touches", "cancelled"],
  finishing_touches: ["amendment_period", "completed", "cancelled"],
  amendment_period: ["design_in_progress", "completed", "cancelled"],
  completed: ["archived"],
  archived: [],
  cancelled: ["request_received", "archived"],
};

export function isStandardStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return STANDARD_STATUS_TRANSITIONS[from].includes(to);
}
