begin;

create extension if not exists pgcrypto;

create type public.profile_role as enum ('client', 'admin');
create type public.order_status as enum (
  'request_received',
  'payment_confirmed',
  'design_in_progress',
  'finishing_touches',
  'amendment_period',
  'completed',
  'archived',
  'cancelled'
);
create type public.payment_status as enum ('pending', 'proof_uploaded', 'confirmed', 'rejected');
create type public.order_priority as enum ('normal', 'high', 'urgent');
create type public.asset_type as enum (
  'player_photo',
  'tournament_logo',
  'sponsor_logo',
  'payment_proof',
  'final_poster'
);
create type public.amendment_status as enum ('submitted', 'reviewing', 'resolved', 'cancelled');
create type public.amendment_billing_kind as enum ('free', 'paid_required', 'paid_confirmed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  whatsapp text,
  instagram_handle text,
  role public.profile_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  poster_count integer not null check (poster_count > 0),
  price_myr numeric(10, 2) not null check (price_myr >= 0),
  free_amendments integer not null check (free_amendments >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  preview_image_path text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.payment_settings (
  id boolean primary key default true check (id),
  bank_name text,
  account_name text,
  account_number text,
  duitnow_id text,
  qr_image_path text,
  instructions text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.order_number_sequences (
  year integer primary key check (year between 2000 and 9999),
  last_value integer not null check (last_value > 0)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  client_id uuid not null references public.profiles(id) on delete restrict,
  player_name text not null,
  instagram_handle text,
  whatsapp text not null,
  tournament_name text not null,
  tournament_start_date date not null,
  tournament_end_date date not null,
  tournament_location text not null,
  package_id uuid not null references public.packages(id) on delete restrict,
  package_name_snapshot text not null,
  package_price_snapshot numeric(10, 2) not null check (package_price_snapshot >= 0),
  poster_count_snapshot integer not null check (poster_count_snapshot > 0),
  free_amendments_total integer not null check (free_amendments_total >= 0),
  free_amendments_used integer not null default 0 check (free_amendments_used >= 0),
  paid_amendments_used integer not null default 0 check (paid_amendments_used >= 0),
  color_preference text not null,
  custom_color text check (custom_color is null or custom_color ~ '^#[0-9A-Fa-f]{6}$'),
  theme_preference text not null,
  custom_notes text,
  reference_url text,
  preferred_completion_date date,
  payment_status public.payment_status not null default 'pending',
  status public.order_status not null default 'request_received',
  priority public.order_priority not null default 'normal',
  admin_note text,
  client_visible_update text,
  submitted_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_dates_valid check (tournament_end_date >= tournament_start_date),
  constraint amendments_used_valid check (free_amendments_used <= free_amendments_total)
);

create index orders_client_created_idx on public.orders (client_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_tournament_idx on public.orders (tournament_name);

create table public.order_event_details (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_name text not null,
  partner_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index order_event_details_order_idx on public.order_event_details (order_id, sort_order);

create table public.order_assets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  asset_type public.asset_type not null,
  bucket_id text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  is_temporary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create index order_assets_order_idx on public.order_assets (order_id, asset_type);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  company_name text not null,
  logo_asset_id uuid references public.order_assets(id) on delete set null,
  created_at timestamptz not null default now()
);

create index sponsors_order_idx on public.sponsors (order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_events_order_created_idx on public.order_events (order_id, created_at desc);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index order_status_history_order_created_idx on public.order_status_history (order_id, created_at);

create table public.amendments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amendment_number integer not null check (amendment_number > 0),
  request_text text not null check (char_length(request_text) between 2 and 3000),
  status public.amendment_status not null default 'submitted',
  billing_kind public.amendment_billing_kind not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, amendment_number)
);

create table public.deleted_order_log (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  player_name text not null,
  tournament_name text not null,
  exported_at timestamptz,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references public.profiles(id) on delete set null
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger amendments_set_updated_at before update on public.amendments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders
    where id = target_order_id and client_id = (select auth.uid())
  );
$$;

create or replace function public.create_order_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year integer := extract(year from now())::integer;
  next_value integer;
begin
  insert into public.order_number_sequences (year, last_value)
  values (current_year, 1)
  on conflict (year) do update
  set last_value = public.order_number_sequences.last_value + 1
  returning last_value into next_value;

  return format('DF-%s-%s', current_year, lpad(next_value::text, 4, '0'));
end;
$$;

create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.create_order_number();
  end if;
  return new;
end;
$$;

create trigger orders_assign_number before insert on public.orders
for each row execute function public.assign_order_number();

create or replace function public.record_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_record_status_change after update of status on public.orders
for each row execute function public.record_order_status_change();

create or replace function public.submit_amendment(target_order_id uuid, request_body text)
returns public.amendments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
  next_number integer;
  billing public.amendment_billing_kind;
  result public.amendments;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into target_order from public.orders
  where id = target_order_id and client_id = auth.uid()
  for update;

  if not found or target_order.status <> 'amendment_period' then
    raise exception 'Order is not accepting amendments';
  end if;

  if char_length(trim(request_body)) not between 2 and 3000 then
    raise exception 'Invalid amendment request';
  end if;

  select coalesce(max(amendment_number), 0) + 1 into next_number
  from public.amendments where order_id = target_order_id;

  if target_order.free_amendments_used < target_order.free_amendments_total then
    billing := 'free';
    update public.orders set free_amendments_used = free_amendments_used + 1
    where id = target_order_id;
  else
    billing := 'paid_required';
    update public.orders set paid_amendments_used = paid_amendments_used + 1
    where id = target_order_id;
  end if;

  insert into public.amendments (
    order_id, amendment_number, request_text, billing_kind, created_by
  ) values (
    target_order_id, next_number, trim(request_body), billing, auth.uid()
  ) returning * into result;

  insert into public.order_events (order_id, event_type, message, created_by)
  values (target_order_id, 'amendment_submitted', format('Amendment %s submitted', next_number), auth.uid());

  return result;
end;
$$;

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.themes enable row level security;
alter table public.payment_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_event_details enable row level security;
alter table public.order_assets enable row level security;
alter table public.sponsors enable row level security;
alter table public.order_events enable row level security;
alter table public.order_status_history enable row level security;
alter table public.amendments enable row level security;
alter table public.deleted_order_log enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_admin_all" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "packages_public_read_active" on public.packages for select to anon, authenticated
using (active or public.is_admin());
create policy "packages_admin_write" on public.packages for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "themes_public_read_active" on public.themes for select to anon, authenticated
using (active or public.is_admin());
create policy "themes_admin_write" on public.themes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "payment_settings_client_read" on public.payment_settings for select to authenticated using (true);
create policy "payment_settings_admin_write" on public.payment_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "orders_client_read_own" on public.orders for select to authenticated
using (client_id = (select auth.uid()));
create policy "orders_admin_all" on public.orders for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "event_details_client_read_own" on public.order_event_details for select to authenticated
using (public.owns_order(order_id));
create policy "event_details_admin_all" on public.order_event_details for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "assets_client_read_own" on public.order_assets for select to authenticated
using (public.owns_order(order_id));
create policy "assets_admin_all" on public.order_assets for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "sponsors_client_read_own" on public.sponsors for select to authenticated
using (public.owns_order(order_id));
create policy "sponsors_admin_all" on public.sponsors for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "events_client_read_own" on public.order_events for select to authenticated
using (public.owns_order(order_id));
create policy "events_admin_all" on public.order_events for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "history_client_read_own" on public.order_status_history for select to authenticated
using (public.owns_order(order_id));
create policy "history_admin_read" on public.order_status_history for select to authenticated
using (public.is_admin());
create policy "amendments_client_read_own" on public.amendments for select to authenticated
using (public.owns_order(order_id));
create policy "amendments_admin_all" on public.amendments for all to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy "deleted_log_admin_only" on public.deleted_order_log for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Prevent clients from escalating their own role through the otherwise allowed profile update.
revoke update on public.profiles from authenticated;
grant update (full_name, whatsapp, instagram_handle) on public.profiles to authenticated;

grant execute on function public.submit_amendment(uuid, text) to authenticated;
revoke execute on function public.create_order_number() from public, anon, authenticated;
revoke execute on function public.assign_order_number() from public, anon, authenticated;
revoke execute on function public.record_order_status_change() from public, anon, authenticated;

insert into public.packages (name, slug, poster_count, price_myr, free_amendments, sort_order)
values
  ('Single Frame', 'single-frame', 1, 60, 2, 1),
  ('Duo Frame', 'duo-frame', 2, 110, 4, 2),
  ('Triple Frame', 'triple-frame', 3, 155, 6, 3),
  ('Five Frame', 'five-frame', 5, 230, 10, 4)
on conflict (slug) do update set
  name = excluded.name,
  poster_count = excluded.poster_count,
  price_myr = excluded.price_myr,
  free_amendments = excluded.free_amendments,
  sort_order = excluded.sort_order;

insert into public.themes (name, slug, description, sort_order)
values
  ('Minimalist', 'minimalist', 'Restrained composition with confident typography.', 1),
  ('Clean & Premium', 'clean-premium', 'Polished editorial spacing and refined details.', 2),
  ('Powerful / Athletic', 'powerful-athletic', 'High-energy sports direction with strong movement.', 3),
  ('Futuristic', 'futuristic', 'Technical shapes and forward-looking visual language.', 4),
  ('Cyberpunk', 'cyberpunk', 'Electric color, digital texture, and night energy.', 5),
  ('Luxury Sports', 'luxury-sports', 'Dark premium palette with elevated detail.', 6),
  ('Editorial', 'editorial', 'Magazine-inspired type and image hierarchy.', 7),
  ('Neon', 'neon', 'Bright luminous accents and vivid contrast.', 8),
  ('Urban', 'urban', 'Street-influenced texture and bold typography.', 9),
  ('Cinematic', 'cinematic', 'Dramatic lighting and film-poster composition.', 10),
  ('Japanese-inspired', 'japanese-inspired', 'Graphic balance influenced by Japanese poster design.', 11),
  ('Tropical', 'tropical', 'Warm color and expressive island energy.', 12),
  ('Experimental', 'experimental', 'Open creative direction for an unexpected frame.', 13),
  ('Surprise Me', 'surprise', 'The designer chooses the direction.', 99)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.payment_settings (id) values (true) on conflict (id) do nothing;

commit;
