export function getSharedAuthCookieOptions(hostname: string | null) {
  const normalized = hostname?.split(":")[0]?.toLowerCase();
  if (normalized !== "dinkframe.my" && !normalized?.endsWith(".dinkframe.my")) {
    return undefined;
  }

  return {
    domain: ".dinkframe.my",
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}
