import "server-only";

import { timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/config/env";

export function isAutomationRunnerAuthorized(request: Request) {
  const configuredToken = getServerEnv().DINKFRAME_AUTOMATION_RUNNER_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!configuredToken || !authorization?.startsWith("Bearer ")) return false;

  const suppliedToken = authorization.slice("Bearer ".length);
  const supplied = Buffer.from(suppliedToken);
  const expected = Buffer.from(configuredToken);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
