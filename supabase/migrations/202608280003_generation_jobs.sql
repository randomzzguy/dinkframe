begin;

create type public.generation_job_stage as enum (
  'prompt_generation',
  'image_generation'
);

create type public.generation_job_status as enum (
  'queued',
  'claimed',
  'preparing',
  'awaiting_review',
  'submitted',
  'failed',
  'cancelled'
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage public.generation_job_stage not null,
  status public.generation_job_status not null default 'queued',
  submission_mode public.chatgpt_submission_mode not null,
  input_text text not null check (char_length(input_text) between 1 and 50000),
  prompt_template_version text not null,
  brief_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(brief_snapshot) = 'object'),
  asset_manifest jsonb not null default '[]'::jsonb check (jsonb_typeof(asset_manifest) = 'array'),
  runner_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index generation_jobs_queue_idx
on public.generation_jobs (status, created_at)
where status = 'queued';

create index generation_jobs_order_idx
on public.generation_jobs (order_id, created_at desc);

alter table public.generation_jobs enable row level security;

create policy "generation_jobs_admin_only"
on public.generation_jobs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create trigger generation_jobs_set_updated_at
before update on public.generation_jobs
for each row execute function public.set_updated_at();

create or replace function public.claim_generation_job(
  target_runner_id text,
  lease_seconds integer default 900
)
returns public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job public.generation_jobs;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Generation jobs can only be claimed by the automation service';
  end if;

  if char_length(trim(coalesce(target_runner_id, ''))) not between 3 and 120 then
    raise exception 'Runner ID is invalid';
  end if;

  if lease_seconds not between 60 and 3600 then
    raise exception 'Lease duration is invalid';
  end if;

  update public.generation_jobs
  set
    status = 'queued',
    runner_id = null,
    claimed_at = null,
    lease_expires_at = null,
    last_error = 'The previous runner lease expired before submission.'
  where status in ('claimed', 'preparing')
    and lease_expires_at < now();

  select *
  into target_job
  from public.generation_jobs
  where status = 'queued'
  order by created_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.generation_jobs
  set
    status = 'claimed',
    runner_id = trim(target_runner_id),
    claimed_at = now(),
    lease_expires_at = now() + make_interval(secs => lease_seconds),
    attempt_count = attempt_count + 1,
    last_error = null
  where id = target_job.id
  returning * into target_job;

  return target_job;
end;
$$;

create or replace function public.update_generation_job_from_runner(
  target_job_id uuid,
  target_runner_id text,
  next_status public.generation_job_status,
  job_error text default null
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

  if not (
    (current_job.status = 'claimed' and next_status in ('preparing', 'failed'))
    or (current_job.status = 'preparing' and next_status in ('awaiting_review', 'submitted', 'failed'))
    or (current_job.status = 'awaiting_review' and next_status in ('submitted', 'failed'))
  ) then
    raise exception 'Invalid generation job transition from % to %', current_job.status, next_status;
  end if;

  update public.generation_jobs
  set
    status = next_status,
    last_error = case
      when next_status = 'failed' then left(coalesce(job_error, 'The local companion failed.'), 2000)
      else null
    end,
    submitted_at = case when next_status = 'submitted' then now() else submitted_at end,
    completed_at = case when next_status in ('submitted', 'failed') then now() else null end,
    lease_expires_at = case
      when next_status = 'preparing' then now() + interval '15 minutes'
      else null
    end
  where id = target_job_id
  returning * into result_job;

  return result_job;
end;
$$;

revoke execute on function public.claim_generation_job(text, integer)
from public, anon, authenticated;
revoke execute on function public.update_generation_job_from_runner(uuid, text, public.generation_job_status, text)
from public, anon, authenticated;

grant execute on function public.claim_generation_job(text, integer) to service_role;
grant execute on function public.update_generation_job_from_runner(uuid, text, public.generation_job_status, text) to service_role;

comment on table public.generation_jobs is
  'Admin-queued, immutable-input jobs consumed by the local DINKFRAME ChatGPT companion.';

comment on column public.generation_jobs.submission_mode is
  'Snapshot of the global review or auto-send setting at the moment the owner queues the job.';

comment on column public.generation_jobs.asset_manifest is
  'Snapshot of private creative asset metadata. Signed download URLs are generated only when a runner claims the job.';

commit;
