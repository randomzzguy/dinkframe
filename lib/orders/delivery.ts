export const POSTER_DELIVERY_KINDS = ["review", "final"] as const;

export type PosterDeliveryKind = (typeof POSTER_DELIVERY_KINDS)[number];

export const POSTER_DELIVERY_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

type DeliveryFile = Pick<File, "name" | "size" | "type">;

export function validatePosterDeliveryFile(file: DeliveryFile) {
  if (!file.name.trim() || file.name.length > 180) {
    return "Use a filename between 1 and 180 characters.";
  }
  if (file.size <= 0) return "That file is empty.";
  if (
    !(POSTER_DELIVERY_LIMITS.mimeTypes as readonly string[]).includes(file.type)
  ) {
    return "Poster files must be JPEG, PNG, or WebP images.";
  }
  if (file.size > POSTER_DELIVERY_LIMITS.maxBytes) {
    return "Poster files must be 25 MB or smaller.";
  }
  return null;
}

export function createPosterDeliveryStoragePath({
  orderId,
  kind,
  filename,
  uniqueId = crypto.randomUUID(),
}: {
  orderId: string;
  kind: PosterDeliveryKind;
  filename: string;
  uniqueId?: string;
}) {
  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `orders/${orderId}/deliveries/${kind}/${uniqueId}-${safeFilename || "poster"}`;
}

export function posterDeliveryLabel(isTemporary: boolean) {
  return isTemporary ? "Review poster" : "Final poster";
}
