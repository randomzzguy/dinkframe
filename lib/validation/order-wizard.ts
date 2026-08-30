import type { UploadedAssetInput } from "./order";
import { ANNOUNCEMENT_TONES, FRAME_TYPES } from "../orders/frame-types";

export interface WizardDraftValidationInput {
  playerName: string;
  instagramHandle: string;
  whatsapp: string;
  tournamentName: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  tournamentLocation: string;
  frameType: string;
  announcementMessage: string;
  announcementTone: string;
  events: readonly {
    eventName: string;
    partnerName: string;
    placement: string;
  }[];
  sponsors: readonly { companyName: string }[];
  colorPreference: string;
  customColor: string;
  themePreference: string;
  customNotes: string;
  referenceUrl: string;
  packageSlug: string;
  frameEntitlementId?: string;
  confirmedAccurate: boolean;
}

export function getOrderWizardStepError(
  step: number,
  draft: WizardDraftValidationInput,
  assets: readonly UploadedAssetInput[],
): string | null {
  if (
    step === 0 &&
    (draft.playerName.trim().length < 2 ||
      draft.playerName.trim().length > 120 ||
      draft.whatsapp.trim().length < 8 ||
      draft.whatsapp.trim().length > 30)
  ) {
    return "Add a valid player name and WhatsApp number.";
  }
  if (step === 0 && draft.instagramHandle.trim().length > 50) {
    return "Keep the Instagram handle under 50 characters.";
  }

  if (
    step === 1 &&
    (draft.tournamentName.trim().length < 2 ||
      draft.tournamentName.trim().length > 160 ||
      draft.tournamentLocation.trim().length < 2 ||
      draft.tournamentLocation.trim().length > 180 ||
      !draft.tournamentStartDate ||
      !draft.tournamentEndDate)
  ) {
    return "Complete the tournament name, dates, and location.";
  }
  if (step === 1 && draft.tournamentEndDate < draft.tournamentStartDate) {
    return "Tournament end date must be on or after the start date.";
  }
  if (
    step === 1 &&
    assets.filter((asset) => asset.assetType === "tournament_logo").length !== 1
  ) {
    return "Upload the tournament logo.";
  }

  if (
    step === 2 &&
    !FRAME_TYPES.includes(draft.frameType as (typeof FRAME_TYPES)[number])
  ) {
    return "Choose a frame type.";
  }

  if (
    step === 2 &&
    (draft.events.length < 1 ||
      draft.events.length > 12 ||
      draft.events.some(
        (event) =>
          event.eventName.trim().length < 2 ||
          event.eventName.trim().length > 120 ||
          event.partnerName.trim().length > 120,
      ))
  ) {
    return "Add a valid name for every event.";
  }
  if (
    step === 2 &&
    draft.frameType === "congratulations" &&
    draft.events.some((event) => !/^[1-6]$/.test(event.placement))
  ) {
    return "Choose a placement from 1st to 6th for every event.";
  }
  if (
    step === 2 &&
    draft.frameType === "announcement" &&
    (draft.announcementMessage.trim().length < 2 ||
      draft.announcementMessage.trim().length > 500)
  ) {
    return "Describe the announcement in 2 to 500 characters.";
  }
  if (
    step === 2 &&
    draft.frameType === "announcement" &&
    !ANNOUNCEMENT_TONES.includes(
      draft.announcementTone as (typeof ANNOUNCEMENT_TONES)[number],
    )
  ) {
    return "Choose an announcement tone.";
  }

  if (step === 3) {
    const count = assets.filter(
      (asset) => asset.assetType === "player_photo",
    ).length;
    if (count < 2 || count > 8) {
      return "Upload between two and eight player photos.";
    }
  }

  if (
    step === 4 &&
    (draft.sponsors.length > 10 ||
      draft.sponsors.some(
        (sponsor) =>
          sponsor.companyName.trim().length < 2 ||
          sponsor.companyName.trim().length > 120,
      ))
  ) {
    return "Complete or remove each sponsor name.";
  }

  if (
    step === 5 &&
    (!draft.colorPreference.trim() || !draft.themePreference.trim())
  ) {
    return "Choose a color direction and theme.";
  }
  if (
    step === 5 &&
    draft.colorPreference === "custom" &&
    !/^#[0-9a-fA-F]{6}$/.test(draft.customColor)
  ) {
    return "Choose a valid custom color.";
  }
  if (step === 5 && draft.customNotes.length > 2000) {
    return "Keep the creative notes under 2,000 characters.";
  }
  if (
    step === 5 &&
    draft.referenceUrl.trim() &&
    !isValidUrl(draft.referenceUrl)
  ) {
    return "Enter a valid reference link or leave it blank.";
  }

  if (step === 6 && !draft.packageSlug && !draft.frameEntitlementId) {
    return "Choose a package or an available frame credit.";
  }

  if (
    step === 7 &&
    !draft.frameEntitlementId &&
    assets.filter((asset) => asset.assetType === "payment_proof").length !== 1
  ) {
    return "Upload one payment proof.";
  }

  if (step === 8) {
    for (let index = 0; index < 8; index += 1) {
      const error = getOrderWizardStepError(index, draft, assets);
      if (error) return error;
    }
    if (!draft.confirmedAccurate) {
      return "Confirm that the order information and assets are correct.";
    }
  }

  return null;
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
