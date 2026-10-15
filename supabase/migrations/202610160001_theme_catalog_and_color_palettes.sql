begin;

alter table public.orders
add column secondary_colors text[] not null default '{}'::text[],
add constraint orders_secondary_colors_count_valid
check (cardinality(secondary_colors) between 0 and 2),
add constraint orders_secondary_colors_format_valid
check (
  array_position(secondary_colors, null) is null
  and (
    cardinality(secondary_colors) = 0
    or array_to_string(secondary_colors, ',')
      ~ '^#[0-9A-Fa-f]{6}(,#[0-9A-Fa-f]{6})?$'
  )
);

-- Keep established slugs stable while using the requested customer-facing names.
update public.themes set name = 'Minimalism' where slug = 'minimalist';
update public.themes set name = 'Editorial Design' where slug = 'editorial';

insert into public.themes (name, slug, description, sort_order)
values
  ('Claymorphism', 'claymorphism', 'Soft dimensional forms with tactile clay-like depth.', 14),
  ('Cybercore', 'cybercore', 'Dense digital interfaces, chrome type, and internet-age energy.', 15),
  ('Neo-Brutalism', 'neo-brutalism', 'Raw geometry, thick outlines, and unapologetic contrast.', 16),
  ('Scrapbook', 'scrapbook', 'Handmade collage layers, torn paper, tape, and expressive marks.', 17),
  ('Surrealism', 'surrealism', 'Dreamlike scale, impossible space, and symbolic transformations.', 18),
  ('Y2K Aesthetic', 'y2k-aesthetic', 'Glossy turn-of-the-millennium chrome and playful techno forms.', 19),
  ('Pixel Art', 'pixel-art', 'Crisp pixel-grid graphics and arcade-era visual language.', 20),
  ('Synthwave', 'synthwave', 'Retro-futurist gradients, horizon grids, and luminous energy.', 21),
  ('Glassmorphism', 'glassmorphism', 'Layered translucent surfaces with frosted depth and light.', 22),
  ('Neumorphism', 'neumorphism', 'Softly extruded monochrome surfaces and tactile shadows.', 23),
  ('Bento Grid', 'bento-grid', 'A modular panel system with structured visual storytelling.', 24),
  ('Swiss Design', 'swiss-design', 'Asymmetric grids, disciplined typography, and precise spacing.', 25),
  ('Maximalism', 'maximalism', 'Controlled abundance through layered type, pattern, and texture.', 26),
  ('Luxury Typography', 'luxury-typography', 'Refined display type, premium spacing, and elegant detail.', 27),
  ('Conceptual Sketch', 'conceptual-sketch', 'Expressive construction lines, annotations, and unfinished energy.', 28),
  ('Ethereal', 'ethereal', 'Weightless light, translucent atmosphere, and dreamlike depth.', 29),
  ('Bohemian', 'bohemian', 'Warm organic texture and eclectic handcrafted detail.', 30),
  ('Victorian', 'victorian', 'Ornate framing, engraved detail, and dramatic period typography.', 31),
  ('Wabi-Sabi', 'wabi-sabi', 'Quiet asymmetry, natural texture, and beautiful imperfection.', 32)
on conflict (slug) do nothing;

alter function public.submit_order_from_draft(uuid, jsonb, jsonb)
rename to submit_order_from_draft_multi_player_base;

revoke execute on function public.submit_order_from_draft_multi_player_base(
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
  secondary_colors_payload jsonb := coalesce(
    order_payload -> 'secondaryColors',
    '[]'::jsonb
  );
  selected_secondary_colors text[];
  result jsonb;
begin
  if jsonb_typeof(secondary_colors_payload) <> 'array'
    or jsonb_array_length(secondary_colors_payload) > 2
    or exists (
      select 1
      from jsonb_array_elements(secondary_colors_payload) as item
      where jsonb_typeof(item) <> 'string'
        or trim(item #>> '{}') !~ '^#[0-9A-Fa-f]{6}$'
    )
  then
    raise exception 'Secondary color information is invalid';
  end if;

  if coalesce(order_payload ->> 'colorPreference', '') not in (
    'surprise',
    'black-white',
    'blue',
    'cyan',
    'purple',
    'green',
    'red',
    'orange',
    'custom'
  ) then
    raise exception 'Color direction is invalid';
  end if;

  if order_payload ->> 'themePreference' <> 'surprise'
    and not exists (
      select 1
      from public.themes
      where slug = order_payload ->> 'themePreference'
        and active
    )
  then
    raise exception 'Selected theme is unavailable';
  end if;

  select coalesce(array_agg(lower(trim(value)) order by position), '{}'::text[])
  into selected_secondary_colors
  from jsonb_array_elements_text(secondary_colors_payload)
    with ordinality as entry(value, position);

  if cardinality(selected_secondary_colors) <> (
    select count(distinct value)
    from unnest(selected_secondary_colors) as palette_color(value)
  )
  then
    raise exception 'Choose different secondary colors';
  end if;

  if order_payload ->> 'colorPreference' = 'surprise'
    and cardinality(selected_secondary_colors) > 0
  then
    raise exception 'Surprise Me uses a designer-selected palette';
  end if;

  if order_payload ->> 'colorPreference' = 'custom'
    and lower(order_payload ->> 'customColor') = any(selected_secondary_colors)
  then
    raise exception 'Choose colors that are different from the main color';
  end if;

  result := public.submit_order_from_draft_multi_player_base(
    target_draft_id,
    order_payload,
    asset_payload
  );

  update public.orders
  set secondary_colors = selected_secondary_colors
  where id = (result ->> 'id')::uuid;

  return result;
end;
$$;

revoke execute on function public.submit_order_from_draft(uuid, jsonb, jsonb)
from public, anon;
grant execute on function public.submit_order_from_draft(uuid, jsonb, jsonb)
to authenticated;

commit;
