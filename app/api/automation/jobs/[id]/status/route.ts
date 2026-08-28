import { z } from "zod";

import { isAutomationRunnerAuthorized } from "@/lib/automation/runner-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const statusSchema = z.object({
  runnerId: z.string().trim().min(3).max(120),
  status: z.enum(["preparing", "awaiting_review", "submitted", "failed"]),
  error: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAutomationRunnerAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsedId = z.uuid().safeParse(id);
  const parsed = statusSchema.safeParse(await readJson(request));
  if (!parsedId.success || !parsed.success) {
    return Response.json({ error: "Invalid status update" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc(
    "update_generation_job_from_runner",
    {
      target_job_id: parsedId.data,
      target_runner_id: parsed.data.runnerId,
      next_status: parsed.data.status,
      job_error: parsed.data.error,
    },
  );
  if (error) {
    console.error("generation_job_runner_update_failed", error);
    return Response.json(
      { error: "Unable to update the job" },
      { status: 409 },
    );
  }

  return Response.json(
    { job: { id: data.id, status: data.status } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
