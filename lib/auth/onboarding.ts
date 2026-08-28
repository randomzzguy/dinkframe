export function needsOnboarding(fullName: string | null | undefined) {
  return !fullName?.trim();
}
