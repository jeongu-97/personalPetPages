-- Add editable custom Fun Facts and comments payload fields.
-- Safe to run multiple times.

alter table public.pets
  add column if not exists birth_date text not null default '',
  add column if not exists fun_facts jsonb not null default '[]'::jsonb,
  add column if not exists comments jsonb not null default '[]'::jsonb;

update public.pets
set birth_date = ''
where birth_date is null;

update public.pets
set fun_facts = '[]'::jsonb
where fun_facts is null;

update public.pets
set comments = '[]'::jsonb
where comments is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pets_fun_facts_is_array'
  ) then
    alter table public.pets
      add constraint pets_fun_facts_is_array
      check (jsonb_typeof(fun_facts) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pets_comments_is_array'
  ) then
    alter table public.pets
      add constraint pets_comments_is_array
      check (jsonb_typeof(comments) = 'array');
  end if;
end;
$$;
