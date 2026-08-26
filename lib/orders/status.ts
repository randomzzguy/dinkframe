import type { OrderStatus } from "@/lib/types/domain";

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
