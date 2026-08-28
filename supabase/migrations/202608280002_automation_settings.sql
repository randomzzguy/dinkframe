begin;

create type public.chatgpt_submission_mode as enum (
  'review_required',
  'auto_send'
);

create table public.automation_settings (
  id boolean primary key default true check (id),
  chatgpt_submission_mode public.chatgpt_submission_mode not null default 'review_required',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.automation_settings enable row level security;

create policy "automation_settings_admin_only"
on public.automation_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create trigger automation_settings_set_updated_at
before update on public.automation_settings
for each row execute function public.set_updated_at();

insert into public.automation_settings (id, chatgpt_submission_mode)
values (true, 'review_required')
on conflict (id) do nothing;

comment on table public.automation_settings is
  'Admin-only controls for the local DINKFRAME studio automation companion.';

comment on column public.automation_settings.chatgpt_submission_mode is
  'Whether a deliberately queued ChatGPT message pauses for review or may be submitted by the local companion.';

commit;
