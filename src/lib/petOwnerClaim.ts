export type PetOwnerClaim = {
  slug: string;
  token: string;
};

const PET_OWNER_CLAIMS_KEY = 'pet_owner_claims_v1';

const isBrowser = () => typeof window !== 'undefined';

export const getPetOwnerClaims = (): PetOwnerClaim[] => {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(PET_OWNER_CLAIMS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const slug =
          typeof (item as { slug?: unknown }).slug === 'string'
            ? (item as { slug: string }).slug.trim()
            : '';
        const token =
          typeof (item as { token?: unknown }).token === 'string'
            ? (item as { token: string }).token.trim()
            : '';
        if (!slug || !token) return null;
        return { slug, token };
      })
      .filter((item): item is PetOwnerClaim => Boolean(item));
  } catch {
    return [];
  }
};

export const savePetOwnerClaim = (claim: PetOwnerClaim) => {
  if (!isBrowser()) return;
  const claims = getPetOwnerClaims().filter((item) => item.slug !== claim.slug);
  claims.push({ slug: claim.slug, token: claim.token });
  window.localStorage.setItem(PET_OWNER_CLAIMS_KEY, JSON.stringify(claims));
};

export const removePetOwnerClaim = (slug: string) => {
  if (!isBrowser()) return;
  const claims = getPetOwnerClaims().filter((item) => item.slug !== slug);
  window.localStorage.setItem(PET_OWNER_CLAIMS_KEY, JSON.stringify(claims));
};
