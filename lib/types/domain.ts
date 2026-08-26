export const ORDER_STATUSES = [
  "request_received",
  "payment_confirmed",
  "design_in_progress",
  "finishing_touches",
  "amendment_period",
  "completed",
  "archived",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "proof_uploaded",
  "confirmed",
  "rejected",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ASSET_TYPES = [
  "player_photo",
  "tournament_logo",
  "sponsor_logo",
  "payment_proof",
  "final_poster",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export type Priority = "normal" | "high" | "urgent";

export interface PackageSnapshot {
  packageId: string;
  packageName: string;
  posterCount: number;
  priceMyr: number;
  freeAmendments: number;
}
