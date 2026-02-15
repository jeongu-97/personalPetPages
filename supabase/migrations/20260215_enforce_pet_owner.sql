-- Enforce per-creator ownership on pets so only creator can edit/delete.
-- Existing rows with null creator_user_id should be backfilled manually if needed.

alter table public.pets
  add column if not exists creator_user_id uuid references auth.users(id) on delete set null;

create index if not exists pets_creator_user_id_idx
  on public.pets (creator_user_id);

create or replace function public.set_creator_user_id()
returns trigger as $$
begin
  if new.creator_user_id is null then
    new.creator_user_id = auth.uid();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists pets_set_creator_user_id on public.pets;
create trigger pets_set_creator_user_id
before insert on public.pets
for each row execute function public.set_creator_user_id();

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
