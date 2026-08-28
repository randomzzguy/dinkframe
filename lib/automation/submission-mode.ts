export const CHATGPT_SUBMISSION_MODES = [
  "review_required",
  "auto_send",
] as const;

export type ChatGptSubmissionMode = (typeof CHATGPT_SUBMISSION_MODES)[number];

export const DEFAULT_CHATGPT_SUBMISSION_MODE: ChatGptSubmissionMode =
  "review_required";

export function submissionModeFromAutoSendValue(
  value: FormDataEntryValue | null,
): ChatGptSubmissionMode {
  return value === "on" ? "auto_send" : DEFAULT_CHATGPT_SUBMISSION_MODE;
}
