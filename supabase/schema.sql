create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  name text not null default '',
  birth_date text not null default '',
  breed text not null default '',
  age text not null default '',
  weight text not null default '',
  gender text not null default '',
  location text not null default '',
  favorite_food text not null default '',
  favorite_toy text not null default '',
  fun_facts jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  personality text not null default '',
  owner_contact text not null default '',
  health_notes text not null default '',
  main_photo_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.pets
  add column if not exists share_token text,
  add column if not exists birth_date text not null default '',
  add column if not exists owner_contact text not null default '',
  add column if not exists health_notes text not null default '',
  add column if not exists fun_facts jsonb not null default '[]'::jsonb,
  add column if not exists comments jsonb not null default '[]'::jsonb;

alter table public.pets
  alter column share_token set default encode(gen_random_bytes(16), 'hex');

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

drop policy if exists "Public read pets" on public.pets;
drop policy if exists "Authenticated manage pets" on public.pets;
create policy "Authenticated manage pets"
on public.pets
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'owner_contact'
  ) then
    update public.pets
    set owner_contact = health_notes
    where (owner_contact is null or owner_contact = '')
      and (health_notes is not null and health_notes <> '');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'birth_date'
  ) then
    update public.pets
    set birth_date = ''
    where birth_date is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'share_token'
  ) then
    update public.pets
    set share_token = encode(gen_random_bytes(16), 'hex')
    where share_token is null or share_token = '';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'fun_facts'
  ) then
    update public.pets
    set fun_facts = '[]'::jsonb
    where fun_facts is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'comments'
  ) then
    update public.pets
    set comments = '[]'::jsonb
    where comments is null;
  end if;
end;
$$;
