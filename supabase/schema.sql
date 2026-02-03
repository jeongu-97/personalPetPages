create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null default '',
  breed text not null default '',
  age text not null default '',
  weight text not null default '',
  gender text not null default '',
  location text not null default '',
  favorite_food text not null default '',
  favorite_toy text not null default '',
  personality text not null default '',
  health_notes text not null default '',
  main_photo_url text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

alter table public.pets enable row level security;

create policy "Public read pets"
on public.pets
for select
using (true);

create policy "Authenticated manage pets"
on public.pets
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
