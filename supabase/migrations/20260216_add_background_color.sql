-- Store optional custom card background color (hex) set from user edit page.

alter table public.pets
  add column if not exists background_color text not null default '';

update public.pets
set background_color = ''
where background_color is null;
