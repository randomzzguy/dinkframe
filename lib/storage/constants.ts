export const UPLOAD_LIMITS = {
  playerImages: {
    maxBytesEach: 25 * 1024 * 1024,
    maxCount: 8,
    minCount: 2,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  logos: {
    maxBytesEach: 15 * 1024 * 1024,
    maxSponsorCount: 10,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  paymentProof: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  },
} as const;

export const STORAGE_BUCKETS = {
  orderAssets: "order-assets",
  paymentProofs: "payment-proofs",
} as const;
