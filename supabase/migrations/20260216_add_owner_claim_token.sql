-- Add one-time owner claim token hash so anonymous-created profiles
-- can be attached to a real logged-in user later.

alter table public.pets
  add column if not exists owner_claim_hash text;

create index if not exists pets_owner_claim_hash_idx
  on public.pets (owner_claim_hash);

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
