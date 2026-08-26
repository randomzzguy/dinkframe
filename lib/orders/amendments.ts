export interface AmendmentUsage {
  freeTotal: number;
  freeUsed: number;
  paidUsed: number;
}

export interface AmendmentCharge {
  kind: "free" | "paid_required";
  freeRemaining: number;
  additionalPriceMyr: number;
}

export const ADDITIONAL_AMENDMENT_PRICE_MYR = 10;

export function getFreeAmendmentsRemaining(
  usage: Pick<AmendmentUsage, "freeTotal" | "freeUsed">,
): number {
  return Math.max(0, usage.freeTotal - usage.freeUsed);
}

export function classifyNextAmendment(usage: AmendmentUsage): AmendmentCharge {
  const freeRemaining = getFreeAmendmentsRemaining(usage);

  return freeRemaining > 0
    ? {
        kind: "free",
        freeRemaining: freeRemaining - 1,
        additionalPriceMyr: 0,
      }
    : {
        kind: "paid_required",
        freeRemaining: 0,
        additionalPriceMyr: ADDITIONAL_AMENDMENT_PRICE_MYR,
      };
}
