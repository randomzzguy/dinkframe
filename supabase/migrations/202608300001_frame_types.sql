begin;

alter table public.orders
add column frame_type text not null default 'upcoming_event',
add column announcement_message text,
add column announcement_tone text;

alter table public.orders
add constraint orders_frame_type_valid
check (frame_type in ('upcoming_event', 'congratulations', 'announcement')),
add constraint orders_announcement_message_valid
check (
  announcement_message is null
  or char_length(trim(announcement_message)) between 2 and 500
),
add constraint orders_announcement_tone_valid
check (
  announcement_tone is null
  or announcement_tone in (
    'celebratory',
    'exciting',
    'competitive',
    'inspirational',
    'professional',
    'warm',
    'bold'
  )
),
add constraint orders_announcement_fields_match_type
check (
  (
    frame_type = 'announcement'
    and announcement_message is not null
    and announcement_tone is not null
  )
  or (
    frame_type <> 'announcement'
    and announcement_message is null
    and announcement_tone is null
  )
);

alter table public.order_event_details
add column placement smallint,
add constraint order_event_details_placement_valid
check (placement is null or placement between 1 and 6);

alter function public.submit_order_from_draft(uuid, jsonb, jsonb)
rename to submit_order_from_draft_base;

revoke execute on function public.submit_order_from_draft_base(uuid, jsonb, jsonb)
from public, anon, authenticated;

create function public.submit_order_from_draft(
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
  selected_frame_type text := order_payload ->> 'frameType';
  result jsonb;
  result_order_id uuid;
begin
  if coalesce(selected_frame_type, '') not in (
    'upcoming_event',
    'congratulations',
    'announcement'
  ) then
    raise exception 'Frame type information is invalid';
  end if;

  if selected_frame_type = 'announcement' and (
    char_length(trim(coalesce(order_payload ->> 'announcementMessage', '')))
      not between 2 and 500
    or coalesce(order_payload ->> 'announcementTone', '') not in (
      'celebratory',
      'exciting',
      'competitive',
      'inspirational',
      'professional',
      'warm',
      'bold'
    )
  ) then
    raise exception 'Announcement details are incomplete';
  end if;

  if selected_frame_type = 'congratulations' and (
    jsonb_typeof(order_payload -> 'events') <> 'array'
    or exists (
      select 1
      from jsonb_array_elements(order_payload -> 'events') as event_item
      where coalesce(event_item ->> 'placement', '') !~ '^[1-6]$'
    )
  ) then
    raise exception 'Congratulations placements are incomplete';
  end if;

  result := public.submit_order_from_draft_base(
    target_draft_id,
    order_payload,
    asset_payload
  );
  result_order_id := (result ->> 'id')::uuid;

  update public.orders
  set
    frame_type = selected_frame_type,
    announcement_message = case
      when selected_frame_type = 'announcement'
      then trim(order_payload ->> 'announcementMessage')
      else null
    end,
    announcement_tone = case
      when selected_frame_type = 'announcement'
      then order_payload ->> 'announcementTone'
      else null
    end
  where id = result_order_id;

  if selected_frame_type = 'congratulations' then
    update public.order_event_details as detail
    set placement = (event_item ->> 'placement')::smallint
    from jsonb_array_elements(order_payload -> 'events') as event_item
    where detail.order_id = result_order_id
      and detail.sort_order = coalesce(
        (event_item ->> 'sortOrder')::integer,
        0
      );
  end if;

  return result;
end;
$$;

revoke execute on function public.submit_order_from_draft(uuid, jsonb, jsonb)
from public, anon;
grant execute on function public.submit_order_from_draft(uuid, jsonb, jsonb)
to authenticated;

commit;
