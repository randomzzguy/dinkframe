begin;

create type public.frame_entitlement_entry_kind as enum (
  'package_granted',
  'frame_used',
  'amendment_used'
);

create table public.frame_entitlements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  source_order_id uuid not null unique references public.orders(id) on delete restrict,
  package_id uuid not null references public.packages(id) on delete restrict,
  package_name_snapshot text not null,
  frames_total integer not null check (frames_total > 0),
  frames_used integer not null default 1 check (frames_used between 1 and frames_total),
  amendments_total integer not null check (amendments_total >= 0),
  amendments_used integer not null default 0 check (amendments_used between 0 and amendments_total),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index frame_entitlements_client_idx
on public.frame_entitlements (client_id, activated_at, created_at desc);

create table public.frame_entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.frame_entitlements(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  entry_kind public.frame_entitlement_entry_kind not null,
  frame_delta integer not null default 0,
  amendment_delta integer not null default 0,
  created_at timestamptz not null default now(),
  check (frame_delta <> 0 or amendment_delta <> 0),
  check (
    (entry_kind = 'package_granted' and frame_delta > 0 and amendment_delta >= 0)
    or (entry_kind = 'frame_used' and frame_delta = -1 and amendment_delta = 0)
    or (entry_kind = 'amendment_used' and frame_delta = 0 and amendment_delta = -1)
  )
);

create index frame_entitlement_ledger_entitlement_idx
on public.frame_entitlement_ledger (entitlement_id, created_at);

alter table public.orders
add column frame_entitlement_id uuid references public.frame_entitlements(id) on delete restrict;

create index orders_frame_entitlement_idx
on public.orders (frame_entitlement_id, created_at);

create trigger frame_entitlements_set_updated_at
before update on public.frame_entitlements
for each row execute function public.set_updated_at();

alter table public.frame_entitlements enable row level security;
alter table public.frame_entitlement_ledger enable row level security;

create policy "frame_entitlements_read_own_or_admin"
on public.frame_entitlements for select to authenticated
using (client_id = (select auth.uid()) or public.is_admin());

create policy "frame_entitlement_ledger_read_own_or_admin"
on public.frame_entitlement_ledger for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.frame_entitlements as entitlement
    where entitlement.id = entitlement_id
      and entitlement.client_id = (select auth.uid())
  )
);

revoke all on table public.frame_entitlements from anon, authenticated;
revoke all on table public.frame_entitlement_ledger from anon, authenticated;
grant select on table public.frame_entitlements to authenticated;
grant select on table public.frame_entitlement_ledger to authenticated;
grant all on table public.frame_entitlements to service_role;
grant all on table public.frame_entitlement_ledger to service_role;

-- Existing orders become the source order for their original package. This gives
-- legitimate historical multi-frame purchases their unused allowance without
-- trusting any client-provided balance.
insert into public.frame_entitlements (
  client_id,
  source_order_id,
  package_id,
  package_name_snapshot,
  frames_total,
  frames_used,
  amendments_total,
  amendments_used,
  activated_at,
  created_at
)
select
  client_id,
  id,
  package_id,
  package_name_snapshot,
  poster_count_snapshot,
  1,
  free_amendments_total,
  free_amendments_used,
  case when payment_status = 'confirmed' then coalesce(submitted_at, created_at) end,
  created_at
from public.orders;

update public.orders as order_row
set frame_entitlement_id = entitlement.id
from public.frame_entitlements as entitlement
where entitlement.source_order_id = order_row.id;

insert into public.frame_entitlement_ledger (
  entitlement_id, order_id, entry_kind, frame_delta, amendment_delta, created_at
)
select id, source_order_id, 'package_granted', frames_total, amendments_total, created_at
from public.frame_entitlements;

insert into public.frame_entitlement_ledger (
  entitlement_id, order_id, entry_kind, frame_delta, amendment_delta, created_at
)
select id, source_order_id, 'frame_used', -1, 0, created_at
from public.frame_entitlements;

create or replace function public.sync_frame_entitlement_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status is distinct from old.payment_status then
    update public.frame_entitlements
    set activated_at = case
      when new.payment_status = 'confirmed' then coalesce(activated_at, now())
      else null
    end
    where source_order_id = new.id;
  end if;
  return new;
end;
$$;

create trigger orders_sync_frame_entitlement_activation
after update of payment_status on public.orders
for each row execute function public.sync_frame_entitlement_activation();

-- This function is only called by the frame-type-aware public wrapper. Keeping
-- it private prevents callers from bypassing validation while allowing both a
-- new purchase and an existing entitlement to use the same atomic transaction.
create or replace function public.submit_order_from_draft_base(
  target_draft_id uuid,
  order_payload jsonb,
  asset_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_draft public.order_drafts;
  selected_package public.packages;
  selected_entitlement public.frame_entitlements;
  requested_entitlement_id uuid;
  event_item jsonb;
  sponsor_item jsonb;
  result_order public.orders;
  player_photo_count integer;
  payment_proof_count integer;
  tournament_logo_count integer;
  sponsor_logo_count integer;
  using_entitlement boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into target_draft from public.order_drafts
  where id = target_draft_id and client_id = auth.uid() for update;
  if not found then raise exception 'Order draft not found'; end if;

  if nullif(order_payload ->> 'frameEntitlementId', '') is not null then
    begin
      requested_entitlement_id := (order_payload ->> 'frameEntitlementId')::uuid;
    exception when invalid_text_representation then
      raise exception 'Frame credit is invalid';
    end;

    select * into selected_entitlement from public.frame_entitlements
    where id = requested_entitlement_id and client_id = auth.uid() for update;
    if not found or selected_entitlement.activated_at is null then
      raise exception 'Frame credit is unavailable';
    end if;
    if selected_entitlement.frames_used >= selected_entitlement.frames_total then
      raise exception 'No frame credits remain';
    end if;
    select * into selected_package from public.packages
    where id = selected_entitlement.package_id for share;
    if not found then raise exception 'Frame credit package is unavailable'; end if;
    using_entitlement := true;
  else
    select * into selected_package from public.packages
    where slug = order_payload ->> 'packageSlug' and active for share;
    if not found then raise exception 'Selected package is unavailable'; end if;
  end if;

  if char_length(trim(coalesce(order_payload ->> 'playerName', ''))) not between 2 and 120
    or char_length(trim(coalesce(order_payload ->> 'whatsapp', ''))) not between 8 and 30
    or char_length(trim(coalesce(order_payload ->> 'tournamentName', ''))) not between 2 and 160
    or char_length(trim(coalesce(order_payload ->> 'tournamentLocation', ''))) not between 2 and 180
    or char_length(trim(coalesce(order_payload ->> 'colorPreference', ''))) not between 1 and 40
    or char_length(trim(coalesce(order_payload ->> 'themePreference', ''))) not between 1 and 80
  then raise exception 'Required order information is incomplete'; end if;

  if (order_payload ->> 'tournamentStartDate')::date > (order_payload ->> 'tournamentEndDate')::date
  then raise exception 'Tournament dates are invalid'; end if;
  if jsonb_typeof(order_payload -> 'events') <> 'array'
    or jsonb_array_length(order_payload -> 'events') not between 1 and 12
  then raise exception 'At least one event is required'; end if;
  if jsonb_typeof(coalesce(order_payload -> 'sponsors', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(order_payload -> 'sponsors', '[]'::jsonb)) > 10
  then raise exception 'Sponsor information is invalid'; end if;
  if jsonb_typeof(asset_payload) <> 'array'
  then raise exception 'Uploaded asset information is invalid'; end if;

  select count(*) filter (where item ->> 'assetType' = 'player_photo'),
         count(*) filter (where item ->> 'assetType' = 'payment_proof'),
         count(*) filter (where item ->> 'assetType' = 'tournament_logo'),
         count(*) filter (where item ->> 'assetType' = 'sponsor_logo')
  into player_photo_count, payment_proof_count, tournament_logo_count, sponsor_logo_count
  from jsonb_array_elements(asset_payload) as item;

  if player_photo_count not between 2 and 8 then raise exception 'Upload between two and eight player photos'; end if;
  if (using_entitlement and payment_proof_count <> 0)
    or (not using_entitlement and payment_proof_count <> 1)
  then raise exception 'Payment proof does not match the selected payment method'; end if;
  if tournament_logo_count <> 1 then raise exception 'Exactly one tournament logo is required'; end if;
  if sponsor_logo_count > 10 then raise exception 'Upload no more than ten sponsor logos'; end if;

  if exists (
    select 1 from jsonb_array_elements(asset_payload) as item
    where item ->> 'storagePath' not like ('orders/' || target_draft_id::text || '/%')
      or item ->> 'assetType' not in ('player_photo','tournament_logo','sponsor_logo','payment_proof')
      or (item ->> 'assetType' = 'payment_proof' and item ->> 'bucketId' <> 'payment-proofs')
      or (item ->> 'assetType' <> 'payment_proof' and item ->> 'bucketId' <> 'order-assets')
  ) then raise exception 'Uploaded asset paths are invalid'; end if;

  if exists (
    select 1 from jsonb_array_elements(asset_payload) as item
    where not exists (
      select 1 from storage.objects as object
      where object.bucket_id = item ->> 'bucketId' and object.name = item ->> 'storagePath'
    )
  ) then raise exception 'One or more uploaded assets could not be verified'; end if;

  insert into public.orders (
    id, client_id, player_name, instagram_handle, whatsapp, tournament_name,
    tournament_start_date, tournament_end_date, tournament_location, package_id,
    package_name_snapshot, package_price_snapshot, poster_count_snapshot,
    free_amendments_total, color_preference, custom_color, theme_preference,
    custom_notes, reference_url, preferred_completion_date, payment_status,
    status, submitted_at, frame_entitlement_id
  ) values (
    target_draft.id, target_draft.client_id, trim(order_payload ->> 'playerName'),
    nullif(trim(coalesce(order_payload ->> 'instagramHandle', '')), ''),
    trim(order_payload ->> 'whatsapp'), trim(order_payload ->> 'tournamentName'),
    (order_payload ->> 'tournamentStartDate')::date,
    (order_payload ->> 'tournamentEndDate')::date,
    trim(order_payload ->> 'tournamentLocation'), selected_package.id,
    selected_package.name, case when using_entitlement then 0 else selected_package.price_myr end,
    selected_package.poster_count, selected_package.free_amendments,
    trim(order_payload ->> 'colorPreference'),
    nullif(trim(coalesce(order_payload ->> 'customColor', '')), ''),
    trim(order_payload ->> 'themePreference'),
    nullif(trim(coalesce(order_payload ->> 'customNotes', '')), ''),
    nullif(trim(coalesce(order_payload ->> 'referenceUrl', '')), ''),
    nullif(order_payload ->> 'preferredCompletionDate', '')::date,
    case when using_entitlement then 'confirmed'::public.payment_status else 'proof_uploaded'::public.payment_status end,
    case when using_entitlement then 'design_in_progress'::public.order_status else 'request_received'::public.order_status end,
    now(), case when using_entitlement then selected_entitlement.id else null end
  ) returning * into result_order;

  for event_item in select * from jsonb_array_elements(order_payload -> 'events') loop
    if char_length(trim(coalesce(event_item ->> 'eventName', ''))) not between 2 and 120
    then raise exception 'Event information is invalid'; end if;
    insert into public.order_event_details (order_id, event_name, partner_name, sort_order)
    values (result_order.id, trim(event_item ->> 'eventName'),
      nullif(trim(coalesce(event_item ->> 'partnerName', '')), ''),
      coalesce((event_item ->> 'sortOrder')::integer, 0));
  end loop;

  for sponsor_item in select * from jsonb_array_elements(coalesce(order_payload -> 'sponsors', '[]'::jsonb)) loop
    if char_length(trim(coalesce(sponsor_item ->> 'companyName', ''))) not between 2 and 120
    then raise exception 'Sponsor information is invalid'; end if;
    insert into public.sponsors (order_id, company_name)
    values (result_order.id, trim(sponsor_item ->> 'companyName'));
  end loop;

  insert into public.order_assets (
    order_id, asset_type, bucket_id, storage_path, original_filename,
    mime_type, file_size, is_temporary
  )
  select result_order.id, (item ->> 'assetType')::public.asset_type,
    item ->> 'bucketId', item ->> 'storagePath', left(item ->> 'originalFilename', 255),
    coalesce(nullif(object.metadata ->> 'mimetype', ''), item ->> 'mimeType'),
    coalesce((object.metadata ->> 'size')::bigint, (item ->> 'fileSize')::bigint), false
  from jsonb_array_elements(asset_payload) as item
  join storage.objects as object on object.bucket_id = item ->> 'bucketId'
    and object.name = item ->> 'storagePath';

  if using_entitlement then
    update public.frame_entitlements set frames_used = frames_used + 1
    where id = selected_entitlement.id;
    insert into public.frame_entitlement_ledger (entitlement_id, order_id, entry_kind, frame_delta)
    values (selected_entitlement.id, result_order.id, 'frame_used', -1);
  else
    insert into public.frame_entitlements (
      client_id, source_order_id, package_id, package_name_snapshot,
      frames_total, frames_used, amendments_total, amendments_used
    ) values (
      target_draft.client_id, result_order.id, selected_package.id, selected_package.name,
      selected_package.poster_count, 1, selected_package.free_amendments, 0
    ) returning * into selected_entitlement;
    update public.orders set frame_entitlement_id = selected_entitlement.id where id = result_order.id;
    insert into public.frame_entitlement_ledger (
      entitlement_id, order_id, entry_kind, frame_delta, amendment_delta
    ) values (
      selected_entitlement.id, result_order.id, 'package_granted',
      selected_entitlement.frames_total, selected_entitlement.amendments_total
    );
    insert into public.frame_entitlement_ledger (entitlement_id, order_id, entry_kind, frame_delta)
    values (selected_entitlement.id, result_order.id, 'frame_used', -1);
  end if;

  insert into public.order_status_history (order_id, old_status, new_status, note, changed_by)
  values (result_order.id, null, result_order.status,
    case when using_entitlement then 'Order submitted using an existing frame credit' else 'Order submitted by client' end,
    auth.uid());
  insert into public.order_events (order_id, event_type, message, created_by, is_client_visible)
  values (result_order.id, 'order_submitted',
    case when using_entitlement
      then 'Frame credit applied. Your poster is now in production.'
      else 'Order received. We will review the submission and payment shortly.' end,
    auth.uid(), true);

  update public.profiles set
    full_name = coalesce(full_name, trim(order_payload ->> 'playerName')),
    whatsapp = trim(order_payload ->> 'whatsapp'),
    instagram_handle = nullif(trim(coalesce(order_payload ->> 'instagramHandle', '')), '')
  where id = auth.uid();
  delete from public.order_drafts where id = target_draft.id;

  return jsonb_build_object('id', result_order.id, 'orderNumber', result_order.order_number);
end;
$$;

revoke execute on function public.submit_order_from_draft_base(uuid, jsonb, jsonb)
from public, anon, authenticated;

create or replace function public.submit_amendment(target_order_id uuid, request_body text)
returns public.amendments
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
  entitlement public.frame_entitlements;
  next_number integer;
  billing public.amendment_billing_kind;
  result public.amendments;
  has_entitlement boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into target_order from public.orders
  where id = target_order_id and client_id = auth.uid() for update;
  if not found or target_order.status <> 'amendment_period'
  then raise exception 'Order is not accepting amendments'; end if;
  if char_length(trim(request_body)) not between 2 and 3000
  then raise exception 'Invalid amendment request'; end if;

  select coalesce(max(amendment_number), 0) + 1 into next_number
  from public.amendments where order_id = target_order_id;

  if target_order.frame_entitlement_id is not null then
    select * into entitlement from public.frame_entitlements
    where id = target_order.frame_entitlement_id and client_id = auth.uid() for update;
    has_entitlement := found;
  end if;

  if has_entitlement and entitlement.amendments_used < entitlement.amendments_total then
    billing := 'free';
    update public.frame_entitlements set amendments_used = amendments_used + 1 where id = entitlement.id;
    update public.orders set free_amendments_used = free_amendments_used + 1 where id = target_order_id;
    insert into public.frame_entitlement_ledger (entitlement_id, order_id, entry_kind, amendment_delta)
    values (entitlement.id, target_order_id, 'amendment_used', -1);
  elsif target_order.frame_entitlement_id is null
    and target_order.free_amendments_used < target_order.free_amendments_total then
    billing := 'free';
    update public.orders set free_amendments_used = free_amendments_used + 1 where id = target_order_id;
  else
    billing := 'paid_required';
    update public.orders set paid_amendments_used = paid_amendments_used + 1 where id = target_order_id;
  end if;

  insert into public.amendments (order_id, amendment_number, request_text, billing_kind, created_by)
  values (target_order_id, next_number, trim(request_body), billing, auth.uid()) returning * into result;
  insert into public.order_events (order_id, event_type, message, created_by)
  values (target_order_id, 'amendment_submitted', format('Amendment %s submitted', next_number), auth.uid());
  return result;
end;
$$;

revoke execute on function public.submit_amendment(uuid, text) from public, anon;
grant execute on function public.submit_amendment(uuid, text) to authenticated;

commit;
