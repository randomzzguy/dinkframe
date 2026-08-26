begin;

alter table public.order_events
add column is_client_visible boolean not null default false;

drop policy if exists "events_client_read_own" on public.order_events;
create policy "events_client_read_visible_own"
on public.order_events for select to authenticated
using (public.owns_order(order_id) and is_client_visible);

drop policy if exists "history_client_read_own" on public.order_status_history;

create table public.order_drafts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  form_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index order_drafts_client_updated_idx
on public.order_drafts (client_id, updated_at desc);

create trigger order_drafts_set_updated_at before update on public.order_drafts
for each row execute function public.set_updated_at();

create or replace function public.owns_order_draft(target_draft_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.order_drafts
    where id = target_draft_id and client_id = (select auth.uid())
  );
$$;

alter table public.order_drafts enable row level security;

create policy "order_drafts_client_all_own"
on public.order_drafts for all to authenticated
using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

create policy "order_drafts_admin_read"
on public.order_drafts for select to authenticated
using (public.is_admin());

create or replace function public.submit_order_from_draft(
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
  event_item jsonb;
  sponsor_item jsonb;
  result_order public.orders;
  player_photo_count integer;
  payment_proof_count integer;
  tournament_logo_count integer;
  sponsor_logo_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into target_draft
  from public.order_drafts
  where id = target_draft_id and client_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order draft not found';
  end if;

  select * into selected_package
  from public.packages
  where slug = order_payload ->> 'packageSlug' and active
  for share;

  if not found then
    raise exception 'Selected package is unavailable';
  end if;

  if char_length(trim(coalesce(order_payload ->> 'playerName', ''))) not between 2 and 120
    or char_length(trim(coalesce(order_payload ->> 'whatsapp', ''))) not between 8 and 30
    or char_length(trim(coalesce(order_payload ->> 'tournamentName', ''))) not between 2 and 160
    or char_length(trim(coalesce(order_payload ->> 'tournamentLocation', ''))) not between 2 and 180
    or char_length(trim(coalesce(order_payload ->> 'colorPreference', ''))) not between 1 and 40
    or char_length(trim(coalesce(order_payload ->> 'themePreference', ''))) not between 1 and 80
  then
    raise exception 'Required order information is incomplete';
  end if;

  if (order_payload ->> 'tournamentStartDate')::date
    > (order_payload ->> 'tournamentEndDate')::date
  then
    raise exception 'Tournament dates are invalid';
  end if;

  if jsonb_typeof(order_payload -> 'events') <> 'array'
    or jsonb_array_length(order_payload -> 'events') not between 1 and 12
  then
    raise exception 'At least one event is required';
  end if;

  if jsonb_typeof(coalesce(order_payload -> 'sponsors', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(order_payload -> 'sponsors', '[]'::jsonb)) > 10
  then
    raise exception 'Sponsor information is invalid';
  end if;

  if jsonb_typeof(asset_payload) <> 'array' then
    raise exception 'Uploaded asset information is invalid';
  end if;

  select count(*) filter (where item ->> 'assetType' = 'player_photo'),
         count(*) filter (where item ->> 'assetType' = 'payment_proof'),
         count(*) filter (where item ->> 'assetType' = 'tournament_logo'),
         count(*) filter (where item ->> 'assetType' = 'sponsor_logo')
  into player_photo_count, payment_proof_count, tournament_logo_count, sponsor_logo_count
  from jsonb_array_elements(asset_payload) as item;

  if player_photo_count not between 2 and 8 then
    raise exception 'Upload between two and eight player photos';
  end if;

  if payment_proof_count <> 1 then
    raise exception 'Exactly one payment proof is required';
  end if;

  if tournament_logo_count <> 1 then
    raise exception 'Exactly one tournament logo is required';
  end if;

  if sponsor_logo_count > 10 then
    raise exception 'Upload no more than ten sponsor logos';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(asset_payload) as item
    where item ->> 'storagePath' not like ('orders/' || target_draft_id::text || '/%')
      or item ->> 'assetType' not in (
        'player_photo', 'tournament_logo', 'sponsor_logo', 'payment_proof'
      )
      or (
        item ->> 'assetType' = 'payment_proof'
        and item ->> 'bucketId' <> 'payment-proofs'
      )
      or (
        item ->> 'assetType' <> 'payment_proof'
        and item ->> 'bucketId' <> 'order-assets'
      )
  ) then
    raise exception 'Uploaded asset paths are invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(asset_payload) as item
    where not exists (
      select 1 from storage.objects as object
      where object.bucket_id = item ->> 'bucketId'
        and object.name = item ->> 'storagePath'
    )
  ) then
    raise exception 'One or more uploaded assets could not be verified';
  end if;

  insert into public.orders (
    id,
    client_id,
    player_name,
    instagram_handle,
    whatsapp,
    tournament_name,
    tournament_start_date,
    tournament_end_date,
    tournament_location,
    package_id,
    package_name_snapshot,
    package_price_snapshot,
    poster_count_snapshot,
    free_amendments_total,
    color_preference,
    custom_color,
    theme_preference,
    custom_notes,
    reference_url,
    preferred_completion_date,
    payment_status,
    status,
    submitted_at
  ) values (
    target_draft.id,
    target_draft.client_id,
    trim(order_payload ->> 'playerName'),
    nullif(trim(coalesce(order_payload ->> 'instagramHandle', '')), ''),
    trim(order_payload ->> 'whatsapp'),
    trim(order_payload ->> 'tournamentName'),
    (order_payload ->> 'tournamentStartDate')::date,
    (order_payload ->> 'tournamentEndDate')::date,
    trim(order_payload ->> 'tournamentLocation'),
    selected_package.id,
    selected_package.name,
    selected_package.price_myr,
    selected_package.poster_count,
    selected_package.free_amendments,
    trim(order_payload ->> 'colorPreference'),
    nullif(trim(coalesce(order_payload ->> 'customColor', '')), ''),
    trim(order_payload ->> 'themePreference'),
    nullif(trim(coalesce(order_payload ->> 'customNotes', '')), ''),
    nullif(trim(coalesce(order_payload ->> 'referenceUrl', '')), ''),
    nullif(order_payload ->> 'preferredCompletionDate', '')::date,
    'proof_uploaded',
    'request_received',
    now()
  ) returning * into result_order;

  for event_item in select * from jsonb_array_elements(order_payload -> 'events')
  loop
    if char_length(trim(coalesce(event_item ->> 'eventName', ''))) not between 2 and 120 then
      raise exception 'Event information is invalid';
    end if;

    insert into public.order_event_details (
      order_id, event_name, partner_name, sort_order
    ) values (
      result_order.id,
      trim(event_item ->> 'eventName'),
      nullif(trim(coalesce(event_item ->> 'partnerName', '')), ''),
      coalesce((event_item ->> 'sortOrder')::integer, 0)
    );
  end loop;

  for sponsor_item in
    select * from jsonb_array_elements(coalesce(order_payload -> 'sponsors', '[]'::jsonb))
  loop
    if char_length(trim(coalesce(sponsor_item ->> 'companyName', ''))) not between 2 and 120 then
      raise exception 'Sponsor information is invalid';
    end if;

    insert into public.sponsors (order_id, company_name)
    values (result_order.id, trim(sponsor_item ->> 'companyName'));
  end loop;

  insert into public.order_assets (
    order_id,
    asset_type,
    bucket_id,
    storage_path,
    original_filename,
    mime_type,
    file_size,
    is_temporary
  )
  select
    result_order.id,
    (item ->> 'assetType')::public.asset_type,
    item ->> 'bucketId',
    item ->> 'storagePath',
    left(item ->> 'originalFilename', 255),
    coalesce(nullif(object.metadata ->> 'mimetype', ''), item ->> 'mimeType'),
    coalesce((object.metadata ->> 'size')::bigint, (item ->> 'fileSize')::bigint),
    false
  from jsonb_array_elements(asset_payload) as item
  join storage.objects as object
    on object.bucket_id = item ->> 'bucketId'
    and object.name = item ->> 'storagePath';

  insert into public.order_status_history (
    order_id, old_status, new_status, note, changed_by
  ) values (
    result_order.id,
    null,
    'request_received',
    'Order submitted by client',
    auth.uid()
  );

  insert into public.order_events (
    order_id, event_type, message, created_by, is_client_visible
  )
  values (
    result_order.id,
    'order_submitted',
    'Order received. We will review the submission and payment shortly.',
    auth.uid(),
    true
  );

  update public.profiles set
    full_name = coalesce(full_name, trim(order_payload ->> 'playerName')),
    whatsapp = trim(order_payload ->> 'whatsapp'),
    instagram_handle = nullif(trim(coalesce(order_payload ->> 'instagramHandle', '')), '')
  where id = auth.uid();

  delete from public.order_drafts where id = target_draft.id;

  return jsonb_build_object(
    'id', result_order.id,
    'orderNumber', result_order.order_number
  );
end;
$$;

create or replace function public.record_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history (
      order_id, old_status, new_status, note, changed_by
    ) values (
      new.id,
      old.status,
      new.status,
      nullif(current_setting('dinkframe.status_note', true), ''),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create or replace function public.change_order_status(
  target_order_id uuid,
  next_status public.order_status,
  change_note text default null,
  client_message text default null,
  force_transition boolean default false
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  result public.orders;
  standard_transition boolean;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into current_order from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  standard_transition := case current_order.status
    when 'request_received' then next_status in ('payment_confirmed', 'cancelled')
    when 'payment_confirmed' then next_status in ('design_in_progress', 'cancelled')
    when 'design_in_progress' then next_status in ('finishing_touches', 'cancelled')
    when 'finishing_touches' then next_status in ('amendment_period', 'completed', 'cancelled')
    when 'amendment_period' then next_status in ('design_in_progress', 'completed', 'cancelled')
    when 'completed' then next_status = 'archived'
    when 'cancelled' then next_status in ('request_received', 'archived')
    else false
  end;

  if not standard_transition and not force_transition then
    raise exception 'Unusual status transition requires confirmation';
  end if;

  perform set_config('dinkframe.status_note', coalesce(trim(change_note), ''), true);

  update public.orders set
    status = next_status,
    client_visible_update = coalesce(nullif(trim(client_message), ''), client_visible_update),
    completed_at = case when next_status = 'completed' then now() else completed_at end,
    archived_at = case when next_status = 'archived' then now() else archived_at end
  where id = target_order_id
  returning * into result;

  if nullif(trim(client_message), '') is not null then
    insert into public.order_events (
      order_id, event_type, message, created_by, is_client_visible
    )
    values (
      target_order_id, 'client_update', trim(client_message), auth.uid(), true
    );
  end if;

  return result;
end;
$$;

create or replace function public.change_payment_status(
  target_order_id uuid,
  next_payment_status public.payment_status,
  payment_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  result public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into current_order from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if next_payment_status = 'confirmed' and current_order.status = 'request_received' then
    perform set_config(
      'dinkframe.status_note',
      coalesce(nullif(trim(payment_note), ''), 'Payment confirmed'),
      true
    );

    update public.orders set
      payment_status = next_payment_status,
      status = 'payment_confirmed'
    where id = target_order_id
    returning * into result;
  else
    update public.orders set payment_status = next_payment_status
    where id = target_order_id
    returning * into result;
  end if;

  insert into public.order_events (order_id, event_type, message, created_by)
  values (
    target_order_id,
    'payment_' || next_payment_status::text,
    nullif(trim(payment_note), ''),
    auth.uid()
  );

  return result;
end;
$$;

revoke execute on function public.submit_order_from_draft(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.change_order_status(uuid, public.order_status, text, text, boolean) from public, anon;
revoke execute on function public.change_payment_status(uuid, public.payment_status, text) from public, anon;
grant execute on function public.submit_order_from_draft(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.change_order_status(uuid, public.order_status, text, text, boolean) to authenticated;
grant execute on function public.change_payment_status(uuid, public.payment_status, text) to authenticated;
revoke execute on function public.owns_order_draft(uuid) from public, anon;
grant execute on function public.owns_order_draft(uuid) to authenticated;

create or replace function public.storage_path_is_owned(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folders text[] := storage.foldername(object_name);
  candidate_id uuid;
begin
  if array_length(folders, 1) < 2 then
    return false;
  end if;

  if folders[1] = 'drafts' then
    return folders[2] = auth.uid()::text;
  end if;

  if folders[1] <> 'orders'
    or folders[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return false;
  end if;

  candidate_id := folders[2]::uuid;
  return public.owns_order(candidate_id) or public.owns_order_draft(candidate_id);
end;
$$;

drop policy if exists "clients_delete_own_draft_files" on storage.objects;
drop policy if exists "clients_upload_own_order_files" on storage.objects;
drop policy if exists "clients_update_own_draft_files" on storage.objects;

create policy "clients_upload_unsubmitted_files"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('order-assets', 'payment-proofs')
  and (storage.foldername(name))[1] = 'orders'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.owns_order_draft(((storage.foldername(name))[2])::uuid)
);

create policy "clients_update_unsubmitted_files"
on storage.objects for update to authenticated
using (
  bucket_id in ('order-assets', 'payment-proofs')
  and (storage.foldername(name))[1] = 'orders'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.owns_order_draft(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id in ('order-assets', 'payment-proofs')
  and (storage.foldername(name))[1] = 'orders'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.owns_order_draft(((storage.foldername(name))[2])::uuid)
);

create policy "clients_delete_unsubmitted_files"
on storage.objects for delete to authenticated
using (
  bucket_id in ('order-assets', 'payment-proofs')
  and (storage.foldername(name))[1] = 'orders'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.owns_order_draft(((storage.foldername(name))[2])::uuid)
);

commit;
