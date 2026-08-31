import { z } from "zod";

export const ADMIN_ORDER_DECISIONS = ["open", "confirm", "reject"] as const;
export type AdminOrderDecision = (typeof ADMIN_ORDER_DECISIONS)[number];

const adminOrderActionSchema = z.object({
  order: z.uuid(),
  decision: z.enum(ADMIN_ORDER_DECISIONS),
});

export function getAdminOrderActionDestination(input: {
  order: string | null;
  decision: string | null;
}) {
  const parsed = adminOrderActionSchema.safeParse(input);
  if (!parsed.success) return null;

  const base = `/admin/orders/${parsed.data.order}`;
  return parsed.data.decision === "open"
    ? base
    : `${base}?paymentAction=${parsed.data.decision}`;
}
