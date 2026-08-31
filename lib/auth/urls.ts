import { getPublicEnv } from "@/lib/config/env";

export function getAppLoginUrl() {
  return new URL("/login", getPublicEnv().NEXT_PUBLIC_APP_URL).toString();
}

export function getAppDashboardUrl() {
  return new URL("/dashboard", getPublicEnv().NEXT_PUBLIC_APP_URL).toString();
}

export function getSafeNextPath(
  value: string | string[] | null | undefined,
  fallback = "/dashboard",
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://app.dinkframe.local");
    if (parsed.origin !== "https://app.dinkframe.local") return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

export function getAdminPostLoginPath(nextPath: string) {
  return nextPath === "/admin" || nextPath.startsWith("/admin/")
    ? nextPath
    : "/admin";
}

export function getCrossDomainLoginRedirect(
  requestUrl: URL,
  appUrl: string | undefined,
  siteUrl: string | undefined,
) {
  if (!appUrl || !siteUrl || requestUrl.pathname !== "/login") {
    return null;
  }

  const appOrigin = new URL(appUrl);
  const siteOrigin = new URL(siteUrl);

  if (
    requestUrl.hostname !== siteOrigin.hostname ||
    requestUrl.hostname === appOrigin.hostname
  ) {
    return null;
  }

  const loginUrl = new URL("/login", appOrigin);
  loginUrl.search = requestUrl.search;
  return loginUrl;
}
