begin;

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
    coalesce(
      nullif(trim(client_message), ''),
      case when target_is_review
        then 'A new poster draft is ready for your review.'
        else 'Your final DINKFRAME poster is ready to download.'
      end
    ),
    auth.uid(),
    true
  );

  return result;
end;
$$;

revoke execute on function public.publish_poster_delivery(
  uuid, text, text, text, bigint, boolean, text
) from public, anon;
grant execute on function public.publish_poster_delivery(
  uuid, text, text, text, bigint, boolean, text
) to authenticated;

commit;
