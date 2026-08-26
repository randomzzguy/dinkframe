begin;

alter table public.orders
add column archive_verified_at timestamptz;

create policy "authenticated_read_payment_qr"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and name = 'settings/payment-qr'
);

-- Admins can manage orders, but permanent deletion must go through the audited RPC.
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_read"
on public.orders for select to authenticated
using (public.is_admin());
create policy "orders_admin_insert"
on public.orders for insert to authenticated
with check (public.is_admin());
create policy "orders_admin_update"
on public.orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Asset metadata is removed by the order cascade only after Storage objects are deleted.
drop policy if exists "assets_admin_all" on public.order_assets;
create policy "assets_admin_read"
on public.order_assets for select to authenticated
using (public.is_admin());
create policy "assets_admin_insert"
on public.order_assets for insert to authenticated
with check (public.is_admin());
create policy "assets_admin_update"
on public.order_assets for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.prevent_unverified_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'archived'
    and new.status is distinct from old.status
    and new.archive_verified_at is null
  then
    raise exception 'Verify the local archive before archiving this order';
  end if;
  return new;
end;
$$;

create trigger orders_require_verified_archive
before update of status on public.orders
for each row execute function public.prevent_unverified_archive();

create or replace function public.mark_order_exported(target_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.orders
  set exported_at = now(), archive_verified_at = null
  where id = target_order_id
    and status in ('completed', 'cancelled', 'archived')
  returning * into result;

  if not found then
    raise exception 'Only completed, cancelled, or archived orders can be exported';
  end if;

  return result;
end;
$$;

create or replace function public.verify_order_archive(target_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.orders
  set archive_verified_at = now()
  where id = target_order_id
    and exported_at is not null
    and status in ('completed', 'cancelled', 'archived')
  returning * into result;

  if not found then
    raise exception 'Generate an export before verifying the archive';
  end if;

  return result;
end;
$$;

create or replace function public.archive_order(target_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  perform set_config('dinkframe.status_note', 'Local archive verified', true);

  update public.orders
  set status = 'archived', archived_at = now()
  where id = target_order_id
    and status in ('completed', 'cancelled')
    and exported_at is not null
    and archive_verified_at is not null
  returning * into result;

  if not found then
    raise exception 'The order must be complete and its local archive verified';
  end if;

  return result;
end;
$$;

create or replace function public.delete_archived_order(
  target_order_id uuid,
  confirmation_number text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into target_order
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.status <> 'archived'
    or target_order.exported_at is null
    or target_order.archive_verified_at is null
  then
    raise exception 'Only verified archived orders can be deleted';
  end if;

  if confirmation_number is distinct from target_order.order_number then
    raise exception 'Order number confirmation does not match';
  end if;

  insert into public.deleted_order_log (
    order_number,
    player_name,
    tournament_name,
    exported_at,
    deleted_by
  ) values (
    target_order.order_number,
    target_order.player_name,
    target_order.tournament_name,
    target_order.exported_at,
    auth.uid()
  );

  delete from public.orders where id = target_order.id;

  return jsonb_build_object(
    'id', target_order.id,
    'orderNumber', target_order.order_number
  );
end;
$$;

revoke execute on function public.prevent_unverified_archive() from public, anon, authenticated;
revoke execute on function public.mark_order_exported(uuid) from public, anon;
revoke execute on function public.verify_order_archive(uuid) from public, anon;
revoke execute on function public.archive_order(uuid) from public, anon;
revoke execute on function public.delete_archived_order(uuid, text) from public, anon;
grant execute on function public.mark_order_exported(uuid) to authenticated;
grant execute on function public.verify_order_archive(uuid) to authenticated;
grant execute on function public.archive_order(uuid) to authenticated;
grant execute on function public.delete_archived_order(uuid, text) to authenticated;

commit;
