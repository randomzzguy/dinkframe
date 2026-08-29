begin;

create type public.order_notification_kind as enum (
  'submission_received',
  'payment_confirmed',
  'review_draft_ready',
  'final_poster_ready'
);

create type public.order_notification_status as enum (
  'sending',
  'sent',
  'failed'
);

create table public.order_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  notification_kind public.order_notification_kind not null,
  recipient_email text not null,
  status public.order_notification_status not null default 'sending',
  attempts integer not null default 1 check (attempts between 1 and 20),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, notification_kind),
  check (char_length(recipient_email) between 3 and 320),
  check (provider_message_id is null or char_length(provider_message_id) <= 255),
  check (last_error is null or char_length(last_error) <= 1000)
);

create index order_notification_deliveries_status_idx
on public.order_notification_deliveries (status, updated_at desc);

create trigger order_notification_deliveries_set_updated_at
before update on public.order_notification_deliveries
for each row execute function public.set_updated_at();

alter table public.order_notification_deliveries enable row level security;

create policy "order_notifications_admin_read"
on public.order_notification_deliveries for select to authenticated
using (public.is_admin());

revoke all on table public.order_notification_deliveries from anon, authenticated;
grant select on table public.order_notification_deliveries to authenticated;
grant all on table public.order_notification_deliveries to service_role;

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
  visible_message text;
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
  if current_order.status in ('archived', 'cancelled') then
    raise exception 'This order can no longer receive payment changes';
  end if;

  if next_payment_status = 'confirmed' then
    visible_message := 'Payment confirmed. Your DINKFRAME poster is now in production.';
    perform set_config(
      'dinkframe.status_note',
      coalesce(nullif(trim(payment_note), ''), 'Payment confirmed; production started'),
      true
    );

    update public.orders set
      payment_status = 'confirmed',
      status = case
        when status in ('request_received', 'payment_confirmed')
          then 'design_in_progress'::public.order_status
        else status
      end,
      client_visible_update = visible_message
    where id = target_order_id
    returning * into result;
  else
    update public.orders set payment_status = next_payment_status
    where id = target_order_id
    returning * into result;
  end if;

  insert into public.order_events (
    order_id,
    event_type,
    message,
    created_by,
    is_client_visible
  ) values (
    target_order_id,
    'payment_' || next_payment_status::text,
    case
      when next_payment_status = 'confirmed' then visible_message
      else nullif(trim(payment_note), '')
    end,
    auth.uid(),
    next_payment_status = 'confirmed'
  );

  return result;
end;
$$;

create or replace function public.publish_poster_delivery(
  target_order_id uuid,
  target_storage_path text,
  target_original_filename text,
  target_mime_type text,
  target_file_size bigint,
  target_is_review boolean,
  client_message text default null
)
returns public.order_assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  stored_metadata jsonb;
  stored_size bigint;
  stored_mime text;
  expected_prefix text;
  visible_message text;
  result public.order_assets;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into current_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if current_order.payment_status <> 'confirmed' then
    raise exception 'Payment must be confirmed before publishing posters';
  end if;
  if current_order.status in ('archived', 'cancelled') then
    raise exception 'This order cannot receive poster deliveries';
  end if;
  if target_is_review and current_order.status = 'completed' then
    raise exception 'A completed order cannot receive a new review draft';
  end if;

  expected_prefix := 'orders/' || target_order_id::text || '/deliveries/' ||
    case when target_is_review then 'review/' else 'final/' end;
  if target_storage_path not like expected_prefix || '%' then
    raise exception 'Invalid poster delivery path';
  end if;
  if char_length(target_original_filename) not between 1 and 255 then
    raise exception 'Invalid poster filename';
  end if;
  if target_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Unsupported poster file type';
  end if;
  if target_file_size <= 0 or target_file_size > 26214400 then
    raise exception 'Poster file exceeds the upload limit';
  end if;

  select metadata into stored_metadata
  from storage.objects
  where bucket_id = 'order-assets'
    and name = target_storage_path;

  if not found then
    raise exception 'The uploaded poster could not be verified';
  end if;

  stored_size := nullif(stored_metadata ->> 'size', '')::bigint;
  stored_mime := coalesce(
    nullif(stored_metadata ->> 'mimetype', ''),
    nullif(stored_metadata ->> 'contentType', '')
  );
  if stored_size is not null and stored_size <> target_file_size then
    raise exception 'Poster file size did not match the uploaded object';
  end if;
  if stored_mime is not null and stored_mime <> target_mime_type then
    raise exception 'Poster file type did not match the uploaded object';
  end if;

  insert into public.order_assets (
    order_id,
    asset_type,
    bucket_id,
    storage_path,
    original_filename,
    mime_type,
    file_size,
    is_temporary
  ) values (
    target_order_id,
    'final_poster',
    'order-assets',
    target_storage_path,
    target_original_filename,
    target_mime_type,
    target_file_size,
    target_is_review
  ) returning * into result;

  visible_message := coalesce(
    nullif(trim(client_message), ''),
    case when target_is_review
      then 'A new poster draft is ready for your review.'
      else 'Your final DINKFRAME poster is ready to download.'
    end
  );
  perform set_config(
    'dinkframe.status_note',
    case when target_is_review
      then 'Review draft published to client'
      else 'Final poster published to client'
    end,
    true
  );

  update public.orders set
    status = case when target_is_review
      then 'amendment_period'::public.order_status
      else 'completed'::public.order_status
    end,
    client_visible_update = visible_message,
    completed_at = case when target_is_review then completed_at else now() end
  where id = target_order_id;

  insert into public.order_events (
    order_id,
    event_type,
    message,
    created_by,
    is_client_visible
  ) values (
    target_order_id,
    case when target_is_review
      then 'review_poster_published'
      else 'final_poster_published'
    end,
    visible_message,
    auth.uid(),
    true
  );

  return result;
end;
$$;

create or replace function public.mark_order_finishing_after_image_approval(
  target_order_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.orders;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Automation service access required';
  end if;

  perform set_config(
    'dinkframe.status_note',
    'Generated image approved for manual finishing',
    true
  );

  update public.orders set status = 'finishing_touches'
  where id = target_order_id
    and payment_status = 'confirmed'
    and status in ('payment_confirmed', 'design_in_progress', 'amendment_period')
  returning * into result;

  if not found then
    select * into result from public.orders where id = target_order_id;
  end if;
  if not found then
    raise exception 'Order not found';
  end if;

  return result;
end;
$$;

revoke execute on function public.mark_order_finishing_after_image_approval(uuid)
from public, anon, authenticated;
grant execute on function public.mark_order_finishing_after_image_approval(uuid)
to service_role;

commit;
