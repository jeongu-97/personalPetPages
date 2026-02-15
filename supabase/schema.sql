create extension if not exists pgcrypto;

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  pet_kind text not null default '',
  creator_user_id uuid references auth.users(id) on delete set null,
  owner_claim_hash text,
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
  add column if not exists pet_kind text not null default '',
  add column if not exists creator_user_id uuid references auth.users(id) on delete set null,
  add column if not exists owner_claim_hash text,
  add column if not exists birth_date text not null default '',
  add column if not exists owner_contact text not null default '',
  add column if not exists health_notes text not null default '',
  add column if not exists fun_facts jsonb not null default '[]'::jsonb,
  add column if not exists comments jsonb not null default '[]'::jsonb;

alter table public.pets
  alter column share_token set default encode(gen_random_bytes(16), 'hex');

create index if not exists pets_creator_user_id_idx
  on public.pets (creator_user_id);

create index if not exists pets_owner_claim_hash_idx
  on public.pets (owner_claim_hash);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pets_pet_kind_valid'
  ) then
    alter table public.pets
      add constraint pets_pet_kind_valid
      check (pet_kind in ('', 'dog', 'cat', 'bird', 'fish'));
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.set_creator_user_id()
returns trigger as $$
begin
  if new.creator_user_id is null then
    new.creator_user_id = auth.uid();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

drop trigger if exists pets_set_creator_user_id on public.pets;
create trigger pets_set_creator_user_id
before insert on public.pets
for each row execute function public.set_creator_user_id();

alter table public.pets enable row level security;

drop policy if exists "Public read pets" on public.pets;
drop policy if exists "Authenticated manage pets" on public.pets;
drop policy if exists "Authenticated select own pets" on public.pets;
drop policy if exists "Authenticated insert own pets" on public.pets;
drop policy if exists "Authenticated update own pets" on public.pets;
drop policy if exists "Authenticated delete own pets" on public.pets;

create policy "Authenticated select own pets"
on public.pets
for select
using (creator_user_id = auth.uid());

create policy "Authenticated insert own pets"
on public.pets
for insert
with check (creator_user_id = auth.uid());

create policy "Authenticated update own pets"
on public.pets
for update
using (creator_user_id = auth.uid())
with check (creator_user_id = auth.uid());

create policy "Authenticated delete own pets"
on public.pets
for delete
using (creator_user_id = auth.uid());

create or replace function public.claim_pet_ownership(p_slug text, p_claim_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_hash := encode(digest(p_claim_token, 'sha256'), 'hex');

  update public.pets
  set creator_user_id = auth.uid(),
      owner_claim_hash = null
  where slug = p_slug
    and owner_claim_hash = v_hash;

  return found;
end;
$$;

revoke all on function public.claim_pet_ownership(text, text) from public;
grant execute on function public.claim_pet_ownership(text, text) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pets'
      and column_name = 'pet_kind'
  ) then
    update public.pets
    set pet_kind = ''
    where pet_kind is null;
  end if;

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
