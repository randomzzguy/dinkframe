begin;

insert into public.themes (name, slug, description, sort_order, active)
values
  (
    'Soft Editorial',
    'soft-editorial',
    'Airy magazine composition, soft daylight, muted tones, and natural retouching.',
    33,
    true
  ),
  (
    'Contemporary Lifestyle',
    'contemporary-lifestyle',
    'Candid sports photography, believable places, and clean lifestyle-brand typography.',
    34,
    true
  ),
  (
    'Art Print',
    'art-print',
    'Gallery-like negative space, tactile paper, one expressive crop, and refined type.',
    35,
    true
  ),
  (
    'Organic Modern',
    'organic-modern',
    'Warm neutral space, soft geometry, natural materials, and calm visual balance.',
    36,
    true
  ),
  (
    'Quiet Luxury',
    'quiet-luxury',
    'Understated premium typography, impeccable spacing, and subtle material detail.',
    37,
    true
  ),
  (
    'Analog Film',
    'analog-film',
    'Documentary sports photography, gentle grain, restrained color, and simple editorial type.',
    38,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = excluded.active;

commit;
