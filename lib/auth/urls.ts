import { getPublicEnv } from "@/lib/config/env";

export function getAppLoginUrl() {
  return new URL("/login", getPublicEnv().NEXT_PUBLIC_APP_URL).toString();
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
