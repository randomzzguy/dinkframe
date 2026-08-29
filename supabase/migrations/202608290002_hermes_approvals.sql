begin;

alter table public.generation_jobs
  add column output_text text,
  add column output_local_path text,
  add column revision_feedback text,
  add column approval_token_hash text,
  add column approval_requested_at timestamptz,
  add column approved_at timestamptz;

alter table public.generation_jobs
  add constraint generation_jobs_output_text_length
    check (output_text is null or char_length(output_text) between 1 and 50000),
  add constraint generation_jobs_output_path_length
    check (output_local_path is null or char_length(output_local_path) between 1 and 1200),
  add constraint generation_jobs_revision_feedback_length
    check (revision_feedback is null or char_length(revision_feedback) between 1 and 3000),
  add constraint generation_jobs_approval_hash_length
    check (approval_token_hash is null or char_length(approval_token_hash) = 64);

create unique index generation_jobs_one_active_stage_idx
on public.generation_jobs (order_id, stage)
where status in ('queued', 'claimed', 'preparing', 'awaiting_review');

create or replace function public.complete_generation_job_for_review(
  target_job_id uuid,
  target_runner_id text,
  generated_output_text text,
  generated_output_local_path text,
  generated_approval_token_hash text
)
returns public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.generation_jobs;
  result_job public.generation_jobs;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Generation jobs can only be updated by the automation service';
  end if;

  select * into current_job
  from public.generation_jobs
  where id = target_job_id
  for update;

  if not found then
    raise exception 'Generation job not found';
  end if;
  if current_job.runner_id is distinct from trim(target_runner_id) then
    raise exception 'Generation job belongs to another runner';
  end if;
  if current_job.status <> 'preparing' then
    raise exception 'Only a preparing job can request review';
  end if;
  if generated_approval_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Approval token hash is invalid';
  end if;
  if current_job.stage = 'prompt_generation'
    and char_length(trim(coalesce(generated_output_text, ''))) not between 100 and 50000 then
    raise exception 'Generated prompt output is invalid';
  end if;
  if current_job.stage = 'image_generation'
    and char_length(trim(coalesce(generated_output_local_path, ''))) not between 1 and 1200 then
    raise exception 'Generated image path is invalid';
  end if;

  update public.generation_jobs
  set
    status = 'awaiting_review',
    output_text = nullif(trim(generated_output_text), ''),
    output_local_path = nullif(trim(generated_output_local_path), ''),
    approval_token_hash = generated_approval_token_hash,
    approval_requested_at = now(),
    completed_at = null,
    lease_expires_at = null,
    last_error = null
  where id = target_job_id
  returning * into result_job;

  return result_job;
end;
$$;

revoke execute on function public.complete_generation_job_for_review(
  uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.complete_generation_job_for_review(
  uuid, text, text, text, text
) to service_role;

comment on column public.generation_jobs.output_text is
  'Hermes-generated prompt awaiting or carrying owner approval.';
comment on column public.generation_jobs.output_local_path is
  'Owner-machine path for a generated image; never exposed to clients.';
comment on column public.generation_jobs.approval_token_hash is
  'SHA-256 hash of the one-time Telegram approval token.';

commit;
