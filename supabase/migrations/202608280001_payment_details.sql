begin;

insert into public.payment_settings (
  id,
  bank_name,
  account_name,
  account_number,
  duitnow_id,
  qr_image_path,
  instructions,
  updated_at
)
values (
  true,
  'GX BANK BERHAD',
  'ZENCODE SOFTWARE LABS',
  '8188-061518-2',
  null,
  null,
  'Pay by bank transfer or scan the Touch ''n Go QR code, then upload your receipt below.',
  now()
)
on conflict (id) do update
set bank_name = excluded.bank_name,
    account_name = excluded.account_name,
    account_number = excluded.account_number,
    duitnow_id = excluded.duitnow_id,
    qr_image_path = excluded.qr_image_path,
    instructions = excluded.instructions,
    updated_at = excluded.updated_at;

commit;
