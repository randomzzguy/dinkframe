export const CLAIM_MAX_ATTEMPTS = 2;
export const CLAIM_RETRY_DELAY_MS = 1_500;
export const CLAIM_FAILURE_ALERT_THRESHOLD = 3;
export const CLAIM_FAILURE_REMINDER_INTERVAL = 15;

export function isRetryableClaimResponse(
  status: number,
  message: string,
  retryableHint = false,
) {
  if (retryableHint) return true;
  if ([408, 425, 429, 502, 503, 504].includes(status)) return true;

  return (
    status === 500 &&
    /unable to claim a job|gateway timeout|temporarily unavailable/i.test(
      message,
    )
  );
}

export function shouldNotifyClaimFailure(consecutiveFailures: number) {
  return (
    consecutiveFailures === CLAIM_FAILURE_ALERT_THRESHOLD ||
    (consecutiveFailures > CLAIM_FAILURE_ALERT_THRESHOLD &&
      consecutiveFailures % CLAIM_FAILURE_REMINDER_INTERVAL === 0)
  );
}
