const ORDER_NUMBER_PATTERN = /^DF-(\d{4})-(\d{4,})$/;

export function formatOrderNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new RangeError("Year must be a four-digit integer.");
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError("Sequence must be a positive integer.");
  }

  return `DF-${year}-${sequence.toString().padStart(4, "0")}`;
}

export function isOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value);
}
