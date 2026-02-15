-- Persist survey-selected pet kind (dog/cat/bird/fish)
-- so fallback profile emoji can follow the exact survey choice.

alter table public.pets
  add column if not exists pet_kind text not null default '';

update public.pets
set pet_kind = ''
where pet_kind is null;

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
