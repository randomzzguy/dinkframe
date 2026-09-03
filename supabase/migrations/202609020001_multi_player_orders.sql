begin;

create table public.order_players (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  client_key uuid not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  instagram_handle text check (
    instagram_handle is null
    or char_length(trim(instagram_handle)) between 1 and 50
  ),
  sort_order smallint not null check (sort_order between 0 and 5),
  created_at timestamptz not null default now(),
  unique (order_id, client_key),
  unique (order_id, sort_order)
);

create index order_players_order_idx
on public.order_players (order_id, sort_order);

alter table public.order_assets
add column player_id uuid references public.order_players(id) on delete set null,
add constraint order_assets_player_link_valid check (
  player_id is null or asset_type = 'player_photo'
);

create index order_assets_player_idx
on public.order_assets (player_id)
where player_id is not null;

-- Existing orders become one-player orders without changing their history.
insert into public.order_players (
  order_id,
  client_key,
  full_name,
  instagram_handle,
  sort_order
)
select id, gen_random_uuid(), player_name, instagram_handle, 0
from public.orders;

update public.order_assets as asset
set player_id = player.id
from public.order_players as player
where asset.order_id = player.order_id
  and asset.asset_type = 'player_photo'
  and player.sort_order = 0;

alter table public.order_players enable row level security;

create policy "order_players_client_read_own"
on public.order_players for select to authenticated
using (public.owns_order(order_id));

create policy "order_players_admin_all"
on public.order_players for all to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke all on table public.order_players from anon, authenticated;
grant select on table public.order_players to authenticated;
grant all on table public.order_players to service_role;

-- Lower the established atomic workflow's total athlete-photo floor from two
-- to one while retaining all of its package, entitlement, Storage, and audit
-- checks. The assertion makes migration drift fail loudly.
do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.submit_order_from_draft_base(uuid,jsonb,jsonb)'::regprocedure
  ) into function_definition;

  if position(
    'player_photo_count not between 2 and 8'
    in function_definition
  ) = 0 then
    raise exception 'Could not locate the player-photo validation to update';
  end if;

  function_definition := replace(
    function_definition,
    'player_photo_count not between 2 and 8',
    'player_photo_count not between 1 and 8'
  );
  function_definition := replace(
    function_definition,
    'Upload between two and eight player photos',
    'Upload between one and eight player photos'
  );
  execute function_definition;
end
$migration$;

alter function public.submit_order_from_draft(uuid, jsonb, jsonb)
rename to submit_order_from_draft_frame_type_base;

revoke execute on function public.submit_order_from_draft_frame_type_base(
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

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
  players_payload jsonb := order_payload -> 'players';
  normalized_payload jsonb;
  result jsonb;
  result_order_id uuid;
  player_item jsonb;
  player_count integer;
  player_photo_count integer;
  display_names text;
begin
  if jsonb_typeof(players_payload) <> 'array'
    or jsonb_array_length(players_payload) not between 1 and 6
  then
    raise exception 'Add between one and six players';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(players_payload) as item
    where coalesce(item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or char_length(trim(coalesce(item ->> 'fullName', ''))) not between 2 and 120
      or char_length(trim(coalesce(item ->> 'instagramHandle', ''))) > 50
  ) then
    raise exception 'Player information is invalid';
  end if;

  select count(*), count(distinct item ->> 'id')
  into player_count, player_photo_count
  from jsonb_array_elements(players_payload) as item;
  if player_count <> player_photo_count then
    raise exception 'Player references must be unique';
  end if;

  if jsonb_typeof(asset_payload) <> 'array' then
    raise exception 'Uploaded asset information is invalid';
  end if;

  select count(*)
  into player_photo_count
  from jsonb_array_elements(asset_payload) as item
  where item ->> 'assetType' = 'player_photo';
  if player_photo_count not between 1 and 8 then
    raise exception 'Upload between one and eight player photos';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(asset_payload) as item
    where (
      item ->> 'assetType' = 'player_photo'
      and not exists (
        select 1
        from jsonb_array_elements(players_payload) as player
        where player ->> 'id' = item ->> 'playerId'
      )
    ) or (
      item ->> 'assetType' <> 'player_photo'
      and item ? 'playerId'
      and nullif(item ->> 'playerId', '') is not null
    )
  ) then
    raise exception 'Player photo assignments are invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(players_payload) as player
    where not exists (
      select 1
      from jsonb_array_elements(asset_payload) as item
      where item ->> 'assetType' = 'player_photo'
        and item ->> 'playerId' = player ->> 'id'
    )
  ) then
    raise exception 'Upload at least one photo for every player';
  end if;

  normalized_payload := order_payload || jsonb_build_object(
    'playerName', trim(players_payload -> 0 ->> 'fullName'),
    'instagramHandle', nullif(
      trim(coalesce(players_payload -> 0 ->> 'instagramHandle', '')),
      ''
    )
  );

  result := public.submit_order_from_draft_frame_type_base(
    target_draft_id,
    normalized_payload,
    asset_payload
  );
  result_order_id := (result ->> 'id')::uuid;

  for player_item in
    select value
    from jsonb_array_elements(players_payload) with ordinality
      as entry(value, position)
    order by position
  loop
    insert into public.order_players (
      order_id,
      client_key,
      full_name,
      instagram_handle,
      sort_order
    ) values (
      result_order_id,
      (player_item ->> 'id')::uuid,
      trim(player_item ->> 'fullName'),
      nullif(trim(coalesce(player_item ->> 'instagramHandle', '')), ''),
      (
        select count(*)
        from public.order_players
        where order_id = result_order_id
      )::smallint
    );
  end loop;

  update public.order_assets as asset
  set player_id = player.id
  from public.order_players as player,
    jsonb_array_elements(asset_payload) as item
  where asset.order_id = result_order_id
    and asset.asset_type = 'player_photo'
    and asset.storage_path = item ->> 'storagePath'
    and item ->> 'assetType' = 'player_photo'
    and player.order_id = result_order_id
    and player.client_key = (item ->> 'playerId')::uuid;

  if exists (
    select 1
    from public.order_assets
    where order_id = result_order_id
      and asset_type = 'player_photo'
      and player_id is null
  ) then
    raise exception 'Player photos could not be linked';
  end if;

  select string_agg(full_name, ', ' order by sort_order)
  into display_names
  from public.order_players
  where order_id = result_order_id;

  update public.orders
  set player_name = display_names
  where id = result_order_id;

  return result;
end;
$$;

revoke execute on function public.submit_order_from_draft(uuid, jsonb, jsonb)
from public, anon;
grant execute on function public.submit_order_from_draft(uuid, jsonb, jsonb)
to authenticated;

commit;
