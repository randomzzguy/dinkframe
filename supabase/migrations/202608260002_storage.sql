begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'order-assets',
    'order-assets',
    false,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'payment-proofs',
    'payment-proofs',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_path_is_owned(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folders text[] := storage.foldername(object_name);
  candidate_order_id uuid;
begin
  if array_length(folders, 1) < 2 then
    return false;
  end if;

  if folders[1] = 'drafts' then
    return folders[2] = auth.uid()::text;
  end if;

  if folders[1] <> 'orders' or folders[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  candidate_order_id := folders[2]::uuid;
  return public.owns_order(candidate_order_id);
end;
$$;

create policy "clients_read_own_order_files"
on storage.objects for select to authenticated
using (
  bucket_id in ('order-assets', 'payment-proofs')
  and (public.storage_path_is_owned(name) or public.is_admin())
);

create policy "clients_upload_own_order_files"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('order-assets', 'payment-proofs')
  and public.storage_path_is_owned(name)
);

create policy "clients_update_own_draft_files"
on storage.objects for update to authenticated
using (
  bucket_id in ('order-assets', 'payment-proofs')
  and public.storage_path_is_owned(name)
)
with check (
  bucket_id in ('order-assets', 'payment-proofs')
  and public.storage_path_is_owned(name)
);

create policy "clients_delete_own_draft_files"
on storage.objects for delete to authenticated
using (
  bucket_id in ('order-assets', 'payment-proofs')
  and (storage.foldername(name))[1] = 'drafts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "admins_manage_order_files"
on storage.objects for all to authenticated
using (
  bucket_id in ('order-assets', 'payment-proofs')
  and public.is_admin()
)
with check (
  bucket_id in ('order-assets', 'payment-proofs')
  and public.is_admin()
);

revoke execute on function public.storage_path_is_owned(text) from public, anon;
grant execute on function public.storage_path_is_owned(text) to authenticated;

commit;
