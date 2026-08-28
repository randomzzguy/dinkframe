import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHATGPT_SUBMISSION_MODE,
  submissionModeFromAutoSendValue,
} from "./submission-mode";

describe("ChatGPT submission mode", () => {
  it("defaults to review when the toggle is absent", () => {
    expect(submissionModeFromAutoSendValue(null)).toBe(
      DEFAULT_CHATGPT_SUBMISSION_MODE,
    );
  });

  it("enables auto-send only for the explicit checked value", () => {
    expect(submissionModeFromAutoSendValue("on")).toBe("auto_send");
    expect(submissionModeFromAutoSendValue("true")).toBe("review_required");
  });
});
