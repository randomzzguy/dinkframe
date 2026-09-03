import { z } from "zod";

import { ANNOUNCEMENT_TONES, FRAME_TYPES } from "@/lib/orders/frame-types";

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
  placement: z.number().int().min(1).max(6).optional(),
  sortOrder: z.number().int().min(0).max(99),
});

export const sponsorSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
});

export const orderPlayerSchema = z.object({
  id: z.uuid(),
  fullName: z.string().trim().min(2).max(120),
  instagramHandle: z
    .string()
    .trim()
    .max(50)
    .transform((value) => value.replace(/^@/, ""))
    .optional(),
});

export const orderDraftSchema = z
  .object({
    players: z.array(orderPlayerSchema).min(1).max(6),
    whatsapp: z.string().trim().min(8).max(30),
    tournamentName: z.string().trim().min(2).max(160),
    tournamentStartDate: z.iso.date(),
    tournamentEndDate: z.iso.date(),
    tournamentLocation: z.string().trim().min(2).max(180),
    frameType: z.enum(FRAME_TYPES),
    announcementMessage: optionalText(500),
    announcementTone: z.enum(ANNOUNCEMENT_TONES).optional(),
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
    frameEntitlementId: z.uuid().optional(),
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
  )
  .superRefine((value, context) => {
    if (
      new Set(value.players.map((player) => player.id)).size !==
      value.players.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Every player must have a unique reference.",
        path: ["players"],
      });
    }

    if (value.frameType === "congratulations") {
      value.events.forEach((event, index) => {
        if (!event.placement) {
          context.addIssue({
            code: "custom",
            message: "Choose the player’s placement for every event.",
            path: ["events", index, "placement"],
          });
        }
      });
    }

    if (value.frameType === "announcement") {
      if (!value.announcementMessage || value.announcementMessage.length < 2) {
        context.addIssue({
          code: "custom",
          message: "Describe what you would like to announce.",
          path: ["announcementMessage"],
        });
      }
      if (!value.announcementTone) {
        context.addIssue({
          code: "custom",
          message: "Choose an announcement tone.",
          path: ["announcementTone"],
        });
      }
    }
  });

export const uploadedAssetSchema = z.object({
  assetType: z.enum(ORDER_UPLOAD_ASSET_TYPES),
  bucketId: z.enum(["order-assets", "payment-proofs"]),
  storagePath: z.string().min(1).max(1024),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  fileSize: z.number().int().positive(),
  playerId: z.uuid().optional(),
});

export const orderSubmissionSchema = z
  .object({
    draftId: z.uuid(),
    order: orderDraftSchema,
    assets: z.array(uploadedAssetSchema).min(2).max(20),
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

    if (playerPhotoCount < 1 || playerPhotoCount > 8) {
      context.addIssue({
        code: "custom",
        message: "Upload between one and eight player photos.",
        path: ["assets"],
      });
    }

    const playerIds = new Set(value.order.players.map((player) => player.id));
    const assignedPlayerIds = new Set(
      value.assets
        .filter((asset) => asset.assetType === "player_photo")
        .map((asset) => asset.playerId),
    );
    if (
      value.assets.some(
        (asset) =>
          (asset.assetType === "player_photo" &&
            (!asset.playerId || !playerIds.has(asset.playerId))) ||
          (asset.assetType !== "player_photo" && asset.playerId),
      ) ||
      value.order.players.some((player) => !assignedPlayerIds.has(player.id))
    ) {
      context.addIssue({
        code: "custom",
        message: "Upload at least one photo for every player.",
        path: ["assets"],
      });
    }

    const expectedPaymentProofCount = value.order.frameEntitlementId ? 0 : 1;
    if (paymentProofCount !== expectedPaymentProofCount) {
      context.addIssue({
        code: "custom",
        message: value.order.frameEntitlementId
          ? "A frame credit does not require another payment proof."
          : "Upload exactly one payment proof.",
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
