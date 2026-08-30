begin;

alter table public.frame_entitlements
drop constraint frame_entitlements_source_order_id_fkey;

alter table public.frame_entitlements
alter column source_order_id drop not null;

alter table public.frame_entitlements
add constraint frame_entitlements_source_order_id_fkey
foreign key (source_order_id) references public.orders(id) on delete set null;

alter table public.frame_entitlement_ledger
drop constraint frame_entitlement_ledger_order_id_fkey;

alter table public.frame_entitlement_ledger
add constraint frame_entitlement_ledger_order_id_fkey
foreign key (order_id) references public.orders(id) on delete set null;

commit;
