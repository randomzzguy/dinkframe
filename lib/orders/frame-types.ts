export const FRAME_TYPES = [
  "upcoming_event",
  "congratulations",
  "announcement",
] as const;

export type FrameType = (typeof FRAME_TYPES)[number];

export const FRAME_TYPE_OPTIONS: Array<{
  value: FrameType;
  label: string;
  description: string;
}> = [
  {
    value: "upcoming_event",
    label: "Upcoming event",
    description: "Promote where and when the player will compete.",
  },
  {
    value: "congratulations",
    label: "Congratulations",
    description: "Celebrate the player’s results in each entered event.",
  },
  {
    value: "announcement",
    label: "Announcement",
    description: "Share a player, team, partnership, or event update.",
  },
];

export const ANNOUNCEMENT_TONES = [
  "celebratory",
  "exciting",
  "competitive",
  "inspirational",
  "professional",
  "warm",
  "bold",
] as const;

export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export const ANNOUNCEMENT_TONE_OPTIONS: Array<{
  value: AnnouncementTone;
  label: string;
}> = [
  { value: "celebratory", label: "Celebratory" },
  { value: "exciting", label: "Exciting / high-energy" },
  { value: "competitive", label: "Competitive / fierce" },
  { value: "inspirational", label: "Inspirational" },
  { value: "professional", label: "Professional / official" },
  { value: "warm", label: "Warm / community" },
  { value: "bold", label: "Bold / dramatic" },
];

export const PLACEMENT_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export function formatFrameType(value: FrameType) {
  return (
    FRAME_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function formatAnnouncementTone(value: AnnouncementTone) {
  return (
    ANNOUNCEMENT_TONE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function formatPlacement(value: number) {
  if (value === 1) return "1st place";
  if (value === 2) return "2nd place";
  if (value === 3) return "3rd place";
  return `${value}th place`;
}
