import { z } from "zod";

const ORDER_UPLOAD_ASSET_TYPES = [
  "player_photo",
  "tournament_logo",
  "sponsor_logo",
  "payment_proof",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();

export const orderEventSchema = z.object({
  eventName: z.string().trim().min(2).max(120),
  partnerName: optionalText(120),
  sortOrder: z.number().int().min(0).max(99),
});

export const sponsorSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
});

export const orderDraftSchema = z
  .object({
    playerName: z.string().trim().min(2).max(120),
    instagramHandle: z
      .string()
      .trim()
      .max(50)
      .transform((value) => value.replace(/^@/, ""))
      .optional(),
    whatsapp: z.string().trim().min(8).max(30),
    tournamentName: z.string().trim().min(2).max(160),
    tournamentStartDate: z.iso.date(),
    tournamentEndDate: z.iso.date(),
    tournamentLocation: z.string().trim().min(2).max(180),
    events: z.array(orderEventSchema).min(1).max(12),
    sponsors: z.array(sponsorSchema).max(10).default([]),
    colorPreference: z.string().trim().min(1).max(40),
    customColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    themePreference: z.string().trim().min(1).max(80),
    customNotes: optionalText(2000),
    referenceUrl: z
      .union([z.literal(""), z.url()])
      .transform((value) => value || undefined)
      .optional(),
    preferredCompletionDate: z
      .union([z.literal(""), z.iso.date()])
      .transform((value) => value || undefined)
      .optional(),
    packageSlug: z.string().trim().min(1).max(80),
    confirmedAccurate: z.literal(true),
  })
  .refine((value) => value.tournamentEndDate >= value.tournamentStartDate, {
    message: "Tournament end date must be on or after the start date.",
    path: ["tournamentEndDate"],
  })
  .refine(
    (value) => value.colorPreference !== "custom" || Boolean(value.customColor),
    {
      message: "Choose a custom color.",
      path: ["customColor"],
    },
  );

export const uploadedAssetSchema = z.object({
  assetType: z.enum(ORDER_UPLOAD_ASSET_TYPES),
  bucketId: z.enum(["order-assets", "payment-proofs"]),
  storagePath: z.string().min(1).max(1024),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  fileSize: z.number().int().positive(),
});

export const orderSubmissionSchema = z
  .object({
    draftId: z.uuid(),
    order: orderDraftSchema,
    assets: z.array(uploadedAssetSchema).min(3).max(20),
  })
  .superRefine((value, context) => {
    const playerPhotoCount = value.assets.filter(
      (asset) => asset.assetType === "player_photo",
    ).length;
    const paymentProofCount = value.assets.filter(
      (asset) => asset.assetType === "payment_proof",
    ).length;
    const tournamentLogoCount = value.assets.filter(
      (asset) => asset.assetType === "tournament_logo",
    ).length;
    const sponsorLogoCount = value.assets.filter(
      (asset) => asset.assetType === "sponsor_logo",
    ).length;

    if (playerPhotoCount < 2 || playerPhotoCount > 8) {
      context.addIssue({
        code: "custom",
        message: "Upload between two and eight player photos.",
        path: ["assets"],
      });
    }

    if (paymentProofCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Upload exactly one payment proof.",
        path: ["assets"],
      });
    }

    if (tournamentLogoCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Upload exactly one tournament logo.",
        path: ["assets"],
      });
    }

    if (sponsorLogoCount > 10) {
      context.addIssue({
        code: "custom",
        message: "Upload no more than ten sponsor logos.",
        path: ["assets"],
      });
    }

    for (const asset of value.assets) {
      if (!asset.storagePath.startsWith(`orders/${value.draftId}/`)) {
        context.addIssue({
          code: "custom",
          message: "An uploaded file does not belong to this order draft.",
          path: ["assets"],
        });
      }
    }
  });

export type OrderDraftInput = z.infer<typeof orderDraftSchema>;
export type UploadedAssetInput = z.infer<typeof uploadedAssetSchema>;
export type OrderSubmissionInput = z.infer<typeof orderSubmissionSchema>;
