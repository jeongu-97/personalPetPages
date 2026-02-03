insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "Public read pet photos"
on storage.objects
for select
using (bucket_id = 'pet-photos');

create policy "Authenticated upload pet photos"
on storage.objects
for insert
with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "Authenticated update pet photos"
on storage.objects
for update
using (bucket_id = 'pet-photos' and auth.role() = 'authenticated')
with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "Authenticated delete pet photos"
on storage.objects
for delete
using (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
