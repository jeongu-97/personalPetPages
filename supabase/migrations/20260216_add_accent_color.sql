-- Store optional custom accent color used for card highlights.

alter table public.pets
  add column if not exists accent_color text not null default '';

update public.pets
set accent_color = ''
where accent_color is null;
